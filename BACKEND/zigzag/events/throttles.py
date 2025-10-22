from rest_framework.throttling import AnonRateThrottle


class RegisterThrottle(AnonRateThrottle):
    """
    Throttle class for registration endpoint.
    Uses 'register' rate from DEFAULT_THROTTLE_RATES setting.
    """
    scope = 'register'


class LoginThrottle(AnonRateThrottle):
    """
    Throttle class for login endpoint.
    Uses 'login' rate from DEFAULT_THROTTLE_RATES setting.
    """
    scope = 'login'
