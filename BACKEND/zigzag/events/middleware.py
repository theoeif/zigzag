import os
import logging
from ipware import get_client_ip
from django.http import HttpResponseForbidden, JsonResponse

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """
    Security middleware that provides IP and domain filtering for different parts of the application.
    
    Environment variables:
    - ADMIN_ALLOWED_IPS: Comma-separated list of IPs allowed to access admin panel
    - API_ALLOWED_IPS: Comma-separated list of IPs allowed to access API endpoints
    - API_ALLOWED_DOMAINS: Comma-separated list of domains allowed to make API calls
    - SECURITY_ENABLED: Set to 'True' to enable security filtering (default: True)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_enabled = os.getenv('SECURITY_ENABLED', 'True').lower() == 'true'
        
        # Load allowed IPs and domains
        self.admin_allowed_ips = self._parse_list(os.getenv('ADMIN_ALLOWED_IPS', ''))
        self.api_allowed_ips = self._parse_list(os.getenv('API_ALLOWED_IPS', ''))
        self.api_allowed_domains = self._parse_list(os.getenv('API_ALLOWED_DOMAINS', ''))

    def _parse_list(self, env_var):
        """Parse comma-separated environment variable into a list."""
        if not env_var:
            return []
        return [item.strip() for item in env_var.split(',') if item.strip()]

    def __call__(self, request):
        if not self.security_enabled:
            return self.get_response(request)

        # Get real client IP (handles proxies, load balancers, etc.)
        client_ip, is_routable = get_client_ip(request)
        
        if not client_ip:
            logger.warning("Could not determine client IP")
            return self._deny_access(request, "Could not determine client IP")

        # Admin panel protection
        if request.path.startswith('/admin/'):
            return self._check_admin_access(request, client_ip)
        
        # API protection
        if request.path.startswith('/api/'):
            return self._check_api_access(request, client_ip)

        # Allow all other requests
        return self.get_response(request)

    def _check_admin_access(self, request, client_ip):
        """Check if client IP is allowed to access admin panel."""
        if not self.admin_allowed_ips:
            logger.warning("No admin allowed IPs configured - allowing all admin access")
            return self.get_response(request)
        
        if client_ip not in self.admin_allowed_ips:
            logger.warning(f"Admin access denied for IP: {client_ip}")
            return self._deny_access(request, "Admin access denied")
        
        logger.info(f"Admin access granted for IP: {client_ip}")
        return self.get_response(request)

    def _check_api_access(self, request, client_ip):
        """Check if client IP and domain are allowed to access API."""
        
        # Log raw headers to assist with diagnostics
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        logger.info(f"API access - UA: {user_agent}, Origin: {origin}, Referer: {referer}")

        # Capacitor/iOS native app detection
        if self._is_capacitor_request(request):
            # logger.info(f"API access granted for Capacitor/iOS app (IP: {client_ip})")
            return self.get_response(request)

        # Real browser requests (http/https origins)
        if self._is_browser_request(request):
            if self.api_allowed_domains:
                domain = self._extract_domain(origin) or self._extract_domain(referer)
                if domain and domain not in self.api_allowed_domains:
                    logger.warning(f"API access denied for domain: {domain}")
                    return self._deny_access(request, "API access denied")
                logger.info(f"API access granted for domain: {domain}")
            else:
                logger.info("API access granted for browser request (no domain restrictions)")
            return self.get_response(request)

        # Explicit server-to-server requests (fallback)
        if self._is_server_to_server(request):
            logger.info(f"API access server_to_server try for server IP: {client_ip}")
            if self.api_allowed_ips and client_ip not in self.api_allowed_ips:
                logger.warning(f"API access denied for server IP: {client_ip}")
                return self._deny_access(request, "API access denied")
            return self.get_response(request)

        return self.get_response(request)

    def _extract_domain(self, url):
        """Extract domain from URL."""
        if not url:
            return None
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            # Preserve scheme for Capacitor so we can recognize it if needed
            if parsed.scheme == 'capacitor':
                return f"{parsed.scheme}://{parsed.netloc}".lower()
            return parsed.netloc.lower()
        except Exception:
            return None

    def _is_capacitor_request(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        from urllib.parse import urlparse
        po = urlparse(origin) if origin else None
        pr = urlparse(referer) if referer else None
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()

        def is_localhost_http(p): 
            return getattr(p, 'scheme', '') in {'http','https'} and getattr(p, 'netloc', '') == 'localhost'

        has_cap_origin = (getattr(po, 'scheme', '') == 'capacitor') or (getattr(pr, 'scheme', '') == 'capacitor')
        has_android_like_origin = is_localhost_http(po) or is_localhost_http(pr)

        # TODO : adjust this condition when we have a stable user-agent for zigzag iOS app
        return (
            has_cap_origin or
            has_android_like_origin or
            'capacitor' in user_agent or
            ('cfnetwork' in user_agent and 'darwin' in user_agent) or
            'zigzag' in user_agent or 
            'ZIGZAG-WebView' in user_agent
        )

    def _is_browser_request(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        if not (origin or referer):
            return False
        from urllib.parse import urlparse
        po = urlparse(origin) if origin else None
        pr = urlparse(referer) if referer else None
        schemes = {getattr(po, 'scheme', ''), getattr(pr, 'scheme', '')}
        return bool(schemes & {'http', 'https'})

    def _is_server_to_server(self, request):
        return not self._is_browser_request(request) and not self._is_capacitor_request(request)

    def _deny_access(self, request, message):
        """Return appropriate denial response."""
        if request.path.startswith('/api/'):
            # Return JSON response for API requests
            return JsonResponse({
                'error': 'Access denied',
                'message': message,
                'status': 403
            }, status=403)
        else:
            # Return HTML response for other requests
            return HttpResponseForbidden(f"<h1>Access Denied</h1><p>{message}</p>")
