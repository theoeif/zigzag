import secrets


def generate_invitation_token():
    """
    Generate a secure, URL-safe invitation token.
    Returns a 32-byte token encoded in base64 URL-safe format.
    """
    return secrets.token_urlsafe(32)
