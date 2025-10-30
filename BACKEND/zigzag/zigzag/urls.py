"""
URL configuration for zigzag project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from events.views import RegisterView, ThrottledTokenObtainPairView, ContactView

urlpatterns = [
    path('admin/', admin.site.urls),

    # events app urls
    path('api/events/', include('events.urls')),

    # customer registration for limiting bots
    path('api/register/', RegisterView.as_view(), name='register'),

    # token urls - use throttled version in production, non-throttled in development
    path('api/token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'), # to delete refresh_token after log out
    
    # contact form endpoint
    path('api/contact/', ContactView.as_view(), name='contact'),
]

from django.http import HttpResponse

def healthz(request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns += [
    path("healthz", healthz),  # or "healthz/"
]
