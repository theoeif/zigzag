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
        # Check if this is a browser request (has origin/referer) or server-to-server request
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        is_browser_request = bool(origin or referer)
        
        if is_browser_request:
            # For browser requests, check domain whitelist
            if self.api_allowed_domains:
                domain = self._extract_domain(origin) or self._extract_domain(referer)
                
                if domain and domain not in self.api_allowed_domains:
                    logger.warning(f"API access denied for domain: {domain}")
                    return self._deny_access(request, "API access denied")
                
                logger.info(f"API access granted for domain: {domain}")
            else:
                logger.info("API access granted for browser request (no domain restrictions)")
        else:
            # For server-to-server requests, check IP whitelist
            if self.api_allowed_ips and client_ip not in self.api_allowed_ips:
                logger.warning(f"API access denied for IP: {client_ip}")
                return self._deny_access(request, "API access denied")
            
            logger.info(f"API access granted for IP: {client_ip}")
        
        return self.get_response(request)

    def _extract_domain(self, url):
        """Extract domain from URL."""
        if not url:
            return None
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return None

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
