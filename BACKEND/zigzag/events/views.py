from django.shortcuts import render

# Create your views here.

# views.py
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q

from .models import Event, Circle, Tag, Address


from .models import Event, Circle, User
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Event, Circle
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for event CRUD, permissions, and private markers.
    """
    serializer_class = EventSerializer  # ← This fixes the error
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "id"

    def get_queryset(self):
        user = self.request.user
        # Circles where the user is a member
        user_circles = Circle.objects.filter(members=user)
        # Events:
        # - Created by the user
        # - Or tagged with circles the user belongs to

        get_events = Event.objects.filter(
            Q(creator=user) | Q(circles__in=user_circles)
        ).distinct()
        print(get_events)
        return get_events

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def check_object_permissions(self, request, obj):
        if request.method in ["PUT", "PATCH", "DELETE"] and obj.creator != request.user:
            self.permission_denied(request, message="You cannot modify this event.")

    def update(self, request, *args, **kwargs):
        self.check_object_permissions(request, self.get_object())
        return super().update(request, *args, **kwargs)

    # patch only address of the event
    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        self.check_object_permissions(request, event)

        address_data = request.data.get("address", None)

        if address_data and isinstance(address_data, dict):
            # Expecting {"id": 1, "address_line": "...", ...}
            addr_id = address_data.pop("id", None)
            if addr_id:
                from .models import Address
                try:
                    address = Address.objects.get(id=addr_id)
                except Address.DoesNotExist:
                    return Response(
                        {"detail": f"Address with id {addr_id} not found."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Update only provided fields on the address
                for field, value in address_data.items():
                    setattr(address, field, value)
                address.save()
                # Attach the updated address to the event instance
                event.address = address
                event.save(update_fields=["address"])

            # Remove address from request data so DRF doesn’t try to re-validate
            mutable_data = request.data.copy()
            mutable_data.pop("address", None)
            serializer = self.get_serializer(event, data=mutable_data, partial=True)

        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


    def destroy(self, request, *args, **kwargs):
        self.check_object_permissions(request, self.get_object())
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def participants(self, request, id=None):
        """
        Return event participants as raw dictionaries.
        """
        event = self.get_object()
        participants = event.participants.select_related('user')
        data = [{"id": p.user.id, "username": p.user.username} for p in participants]
        return Response(data)

    @action(detail=False, methods=['post'])
    def markers(self, request):
        """
        Return private markers for the authenticated user, optionally filtered by tags.
        """
        user = request.user
        tags_param = request.data.get("tags", [])
        user_circles = Circle.objects.filter(members=user)

        events = Event.objects.filter(Q(creator=user) | Q(circles__in=user_circles)).distinct()
        if tags_param:
            events = events.filter(circles__categories__id__in=tags_param).distinct()

        markers = [
            {
                "id": e.id,
                "title": e.title,
                "lat": e.address.latitude if e.address else None,
                "lng": e.address.longitude if e.address else None,
                "description": e.description,
                "start_date": e.start_time,
                "end_date": e.end_time,
            }
            for e in events.select_related("address")
        ]
    
        return Response({"private_markers": markers}, status=status.HTTP_200_OK)
