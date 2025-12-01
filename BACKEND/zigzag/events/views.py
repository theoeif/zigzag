import os
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Prefetch, F
from django.shortcuts import get_object_or_404
from django.contrib.postgres.aggregates import ArrayAgg
from django.http import HttpResponse, Http404
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from icalendar import Calendar, Event as ICalEvent
from anymail.message import AnymailMessage

from .models import (
    Event,
    Circle,
    Address,
    UserAddress,
    Tag,
    Profile,
    User
)
from .utils import generate_invitation_token
from .serializers import (
    EventSerializer,
    AddressSerializer,
    UserAddressSerializer,
    RegisterSerializer,
    TagSerializer,
    ProfileSerializer,
    UserProfileSerializer,
    GreyEventSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ContactFormSerializer,
)
from events.throttles import RegisterThrottle, LoginThrottle, PasswordResetThrottle, ContactThrottle


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for event CRUD, permissions, and private markers.
    """
    serializer_class = EventSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "id"

    # exception for 404 get_queryset invited events
    def get_object(self):
        """
        Override get_object to handle invitation-based access.
        """
        event_id = self.kwargs.get('id')
        
        # First try the normal permission-based access
        try:
            event = super().get_object()
            return event
        except Http404:
            
            # If normal access fails, check if this is an invitation access
            if event_id:
                try:
                    event = Event.objects.get(id=event_id)
                    
                    # Only allow access if the event has an invitation token
                    if event.invitation_token:
                        return event
                    else:
                        print(f"🔍 GET_OBJECT: Event {event_id} has no invitation token")
                except Event.DoesNotExist:
                    print(f"🔍 GET_OBJECT: Event {event_id} does not exist")
                    pass
            
            # If we get here, the event doesn't exist or user has no access
            print(f"🔍 GET_OBJECT: No access granted for event {event_id}")
            raise Http404("No Event matches the given query.")
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to pass request context to serializer"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    def get_queryset(self):
        """
        Return a standard queryset for CRUD operations.
        Grouping for the project view is handled in list().
        """
        user = self.request.user
        user_circles = Circle.objects.filter(members=user)
        
        events = Event.objects.filter(Q(creator=user) | Q(circles__in=user_circles)).distinct()
        
        return events

    def list(self, request, *args, **kwargs):
        """
        Return events grouped into two arrays: events_user and events_invited.
        This preserves a standard queryset for other actions (retrieve, create, update, delete).
        """
        user = request.user
        user_circles = Circle.objects.filter(members=user)

        events_user = Event.objects.filter(creator=user)
        events_invited = Event.objects.filter(circles__in=user_circles).exclude(creator=user).distinct()

        serializer_user = self.get_serializer(events_user, many=True)
        serializer_invited = self.get_serializer(events_invited, many=True)
        return Response({
            "events_user": serializer_user.data,
            "events_invited": serializer_invited.data,
        })

    def create(self, request, *args, **kwargs):
        # Create address first if address data is provided
        address_data = request.data.get("address")
        created_address = None

        if address_data:
            address_serializer = AddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            created_address = address_serializer.save()

        # Extract generate_invitation_link before creating the event
        generate_invitation_link = request.data.get("generate_invitation_link", False)

        # Remove generate_invitation_link from request data before serialization
        event_data = request.data.copy()
        event_data.pop("generate_invitation_link", None)

        # Create the event
        serializer = self.get_serializer(data=event_data)
        serializer.is_valid(raise_exception=True)

        # Save with the created address if one was made
        if created_address:
            event = serializer.save(creator=self.request.user, address=created_address)
        else:
            event = serializer.save(creator=self.request.user)

        # Check if invitation link should be generated
        if generate_invitation_link:
            # Generate invitation token
            event.invitation_token = generate_invitation_token()
            event.save()
            
            # Create invitation circle with default tag
            default_tag = Tag.objects.get(id=2)
            invitation_circle = Circle.objects.create(
                name="Invités",
                creator=self.request.user,
                is_invitation_circle=True,
                linked_event=event
            )
            # Add the creator to the invitation circle
            invitation_circle.members.add(self.request.user)
            # Add the default tag
            invitation_circle.categories.add(default_tag)
            
            event.circles.add(invitation_circle)
        # Return the created event with full address details
        response_serializer = self.get_serializer(event)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def check_object_permissions(self, request, obj):
        if request.method in ["PUT", "PATCH", "DELETE"]:
            # Allow modification if user is the creator
            if obj.creator == request.user:
                return

            # Allow modification if event is shared and user is a member of any associated circle
            if obj.event_shared:
                user_circles = Circle.objects.filter(members=request.user)
                if obj.circles.filter(id__in=user_circles.values_list('id', flat=True)).exists():
                    return

            # Otherwise, deny permission
            self.permission_denied(request, message="You cannot modify this event.")

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        self.check_object_permissions(request, event)

        address_data = request.data.get("address")
        # Extract generate_invitation_link before creating event_data
        generate_invitation_link = request.data.get("generate_invitation_link")
        event_data = {k: v for k, v in request.data.items() if k not in ["address", "generate_invitation_link"]}  # Exclude address and generate_invitation_link from event update

        # Enforce field-level rules
        user_is_creator = (request.user == event.creator)

        # Two-step rule: cannot toggle event_shared from False -> True in same request as date changes
        if (
            "event_shared" in event_data
            and not event.event_shared
            and bool(event_data.get("event_shared")) is True
            and ("start_time" in event_data or "end_time" in event_data)
        ):
            return Response({"detail": "Activate sharing first, then change dates."}, status=status.HTTP_400_BAD_REQUEST)

        # Guard: dates cannot be modified when event is not shared (even by creator)
        if ("start_time" in event_data or "end_time" in event_data) and not event.event_shared:
            return Response({"detail": "Dates can be modified only when event is shared."}, status=status.HTTP_403_FORBIDDEN)

        # When shared, non-creator can only modify description and dates via event fields
        if not user_is_creator and event.event_shared:
            allowed_event_fields = {"description", "start_time", "end_time"}
            extra_fields = set(event_data.keys()) - allowed_event_fields
            if extra_fields:
                return Response(
                    {"detail": "You cannot modify these fields: " + ", ".join(sorted(extra_fields))},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Forbid any address changes by non-creators
        if not user_is_creator:
            if "address" in request.data or address_data is not None:
                return Response({"detail": "Only the creator can modify the address."}, status=status.HTTP_403_FORBIDDEN)

        # Support clearing address explicitly with null (creator only)
        if "address" in request.data and request.data.get("address") is None:
            if not user_is_creator:
                return Response({"detail": "Only the creator can modify the address."}, status=status.HTTP_403_FORBIDDEN)
            event.address = None

        if address_data:
            # If address data is provided, create or update the address
            addr_id = address_data.get("id")
            if addr_id:
                # Update existing address
                try:
                    address = Address.objects.get(id=addr_id)
                    address_serializer = AddressSerializer(address, data=address_data, partial=True)
                    address_serializer.is_valid(raise_exception=True)
                    address_serializer.save()
                    # Update event to use the updated address
                    event.address = address
                except Address.DoesNotExist:
                    return Response({"detail": f"Address with id {addr_id} not found."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Create new address
                address_serializer = AddressSerializer(data=address_data)
                address_serializer.is_valid(raise_exception=True)
                address = address_serializer.save()
                # Update event to use the new address
                event.address = address

        # Update the event (excluding address data since we handle it manually)
        serializer = self.get_serializer(event, data=event_data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Handle invitation link toggle (after event is updated)
        if generate_invitation_link is not None:
            # Check permissions: creator OR (event shared AND user is circle member)
            is_creator = event.creator == request.user
            is_circle_member = False
            if event.event_shared and event.circles.exists():
                is_circle_member = event.circles.filter(members=request.user).exists()
            
            can_manage_invite = is_creator or (event.event_shared and is_circle_member)
            
            if not can_manage_invite:
                return Response(
                    {"error": "You don't have permission to manage invitation links for this event"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if generate_invitation_link:
                # Toggle ON: Create token and circle if they don't exist
                if not event.invitation_token:
                    event.invitation_token = generate_invitation_token()
                    event.save()
                
                # Check if invitation circle exists
                invitation_circle = Circle.objects.filter(
                    is_invitation_circle=True,
                    linked_event=event
                ).first()
                
                if not invitation_circle:
                    # Create invitation circle with default tag
                    default_tag = Tag.objects.get(id=2)
                    invitation_circle = Circle.objects.create(
                        name="Invités",
                        creator=request.user,
                        is_invitation_circle=True,
                        linked_event=event
                    )
                    invitation_circle.members.add(request.user)
                    invitation_circle.categories.add(default_tag)
                    event.circles.add(invitation_circle)
            
            else:
                # Toggle OFF: Remove token but KEEP the circle
                if event.invitation_token:
                    event.invitation_token = None
                    event.save()

        # Return the updated event
        response_serializer = self.get_serializer(event)
        return Response(response_serializer.data)

    # patch only address of the event
    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        self.check_object_permissions(request, event)

        address_data = request.data.get("address", None)
        # Extract generate_invitation_link before creating event_data
        generate_invitation_link = request.data.get("generate_invitation_link")
        event_data = {k: v for k, v in request.data.items() if k not in ["address", "generate_invitation_link"]}  # Exclude address and generate_invitation_link from event update

        # Enforce field-level rules
        user_is_creator = (request.user == event.creator)

        # Two-step rule: cannot toggle event_shared from False -> True in same request as date changes
        if (
            "event_shared" in event_data
            and not event.event_shared
            and bool(event_data.get("event_shared")) is True
            and ("start_time" in event_data or "end_time" in event_data)
        ):
            return Response({"detail": "Activate sharing first, then change dates."}, status=status.HTTP_400_BAD_REQUEST)

        # Guard: dates cannot be modified when event is not shared (even by creator)
        if ("start_time" in event_data or "end_time" in event_data) and not event.event_shared:
            return Response({"detail": "Dates can be modified only when event is shared."}, status=status.HTTP_403_FORBIDDEN)

        # When shared, non-creator can only modify description and dates via event fields
        if not user_is_creator and event.event_shared:
            allowed_event_fields = {"description", "start_time", "end_time"}
            extra_fields = set(event_data.keys()) - allowed_event_fields
            if extra_fields:
                return Response(
                    {"detail": "You cannot modify these fields: " + ", ".join(sorted(extra_fields))},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Forbid any address changes by non-creators
        if not user_is_creator:
            if "address" in request.data or address_data is not None:
                return Response({"detail": "Only the creator can modify the address."}, status=status.HTTP_403_FORBIDDEN)

        # Support clearing address explicitly with null (creator only)
        if "address" in request.data and request.data.get("address") is None:
            if not user_is_creator:
                return Response({"detail": "Only the creator can modify the address."}, status=status.HTTP_403_FORBIDDEN)
            event.address = None

        if address_data and isinstance(address_data, dict):
            addr_id = address_data.get("id")
            if addr_id:
                # Update existing address
                try:
                    address = Address.objects.get(id=addr_id)
                    address_serializer = AddressSerializer(address, data=address_data, partial=True)
                    address_serializer.is_valid(raise_exception=True)
                    address_serializer.save()
                    # Update event to use the updated address
                    event.address = address
                except Address.DoesNotExist:
                    return Response({"detail": f"Address with id {addr_id} not found."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Create new address for partial update
                address_serializer = AddressSerializer(data=address_data)
                address_serializer.is_valid(raise_exception=True)
                address = address_serializer.save()
                # Update event to use the new address
                event.address = address

        # Update the event (excluding address data since we handle it manually)
        serializer = self.get_serializer(event, data=event_data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Handle invitation link toggle (after event is updated)
        if generate_invitation_link is not None:
            # Check permissions: creator OR (event shared AND user is circle member)
            is_creator = event.creator == request.user
            is_circle_member = False
            if event.event_shared and event.circles.exists():
                is_circle_member = event.circles.filter(members=request.user).exists()
            
            can_manage_invite = is_creator or (event.event_shared and is_circle_member)
            
            if not can_manage_invite:
                return Response(
                    {"error": "You don't have permission to manage invitation links for this event"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if generate_invitation_link:
                # Toggle ON: Create token and circle if they don't exist
                if not event.invitation_token:
                    event.invitation_token = generate_invitation_token()
                    event.save()
                
                # Check if invitation circle exists
                invitation_circle = Circle.objects.filter(
                    is_invitation_circle=True,
                    linked_event=event
                ).first()
                
                if not invitation_circle:
                    # Create invitation circle with default tag
                    default_tag = Tag.objects.get(id=2)
                    invitation_circle = Circle.objects.create(
                        name="Invités",
                        creator=request.user,
                        is_invitation_circle=True,
                        linked_event=event
                    )
                    invitation_circle.members.add(request.user)
                    invitation_circle.categories.add(default_tag)
                    event.circles.add(invitation_circle)
            
            else:
                # Toggle OFF: Remove token but KEEP the circle
                if event.invitation_token:
                    event.invitation_token = None
                    event.save()

        # Return the updated event with full address details
        response_serializer = self.get_serializer(event)
        return Response(response_serializer.data)


    def destroy(self, request, *args, **kwargs):
        self.check_object_permissions(request, self.get_object())
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def markers(self, request):
        """
        Return private markers for the authenticated user, optionally filtered by tags.
        Optimized: Uses PostgreSQL ArrayAgg in production, Prefetch for SQLite locally.
        """
        user = request.user
        tags_param = request.data.get("tags", [])
        user_circles = Circle.objects.filter(members=user)

        events = Event.objects.filter(Q(creator=user) | Q(circles__in=user_circles)).distinct()

        # If tags are provided, filter by circle categories
        if tags_param and len(tags_param) > 0:
            # Get events that have circles with the specified tags
            # This ensures we only match circles the user is actually in
            events_with_circles = events.filter(circles__in=user_circles.filter(categories__id__in=tags_param)).distinct()
            # Get solo events (events created by user that have no circles)
            events_solo = Event.objects.filter(
                Q(creator=user) & Q(circles__isnull=True)
            ).distinct()

            # Union both sets of events
            events = events_with_circles.union(events_solo)

            # Since union() doesn't support select_related/prefetch_related,
            # we need to get the IDs and re-query with optimizations
            event_ids = list(events.values_list('id', flat=True))
            events = Event.objects.filter(id__in=event_ids)

        # Check database backend from environment variable
        DEFAULT_DB = os.getenv('DB_DEFAULT', 'default')
        
        if DEFAULT_DB == 'postgres':
            # PostgreSQL: Use ArrayAgg with field aliases - returns exact format needed
            markers = list(
                events.select_related("address").annotate(
                    lat=F('address__latitude'),
                    lng=F('address__longitude'),
                    address_line=F('address__address_line'),
                    start_date=F('start_time'),
                    end_date=F('end_time'),
                    tags=ArrayAgg(
                        'circles__categories__name',
                        distinct=True,
                        filter=Q(
                            circles__categories__name__isnull=False,
                            circles__in=user_circles
                        ),
                        default=[]
                    )
                ).values(
                    'id', 'title', 'description', 'lat', 'lng', 
                    'address_line', 'start_date', 'end_date', 'tags'
                )
            )
        else:
            # SQLite/Other: Use optimized Prefetch
            events_prefetched = events.select_related("address").prefetch_related(
                Prefetch(
                    'circles',
                    queryset=user_circles.prefetch_related(
                        Prefetch('categories', queryset=Tag.objects.only('name'))
                    ).only('id')
                )
            )

            markers = []
            for e in events_prefetched:
                # Collect unique tag names using set for O(1) lookups
                event_tags = set()
                for circle in e.circles.all():
                    event_tags.update(tag.name for tag in circle.categories.all())

                markers.append({
                    "id": e.id,
                    "title": e.title,
                    "lat": e.address.latitude if e.address else None,
                    "lng": e.address.longitude if e.address else None,
                    "address_line": e.address.address_line if e.address else None,
                    "description": e.description,
                    "start_date": e.start_time,
                    "end_date": e.end_time,
                    "tags": sorted(event_tags),
                })

        return Response({"private_markers": markers}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def generate_invite(self, request, id=None):
        """
        Generate an invitation link for the event.
        Creates invitation token if doesn't exist and creates invitation circle.
        """
        try:
            event = Event.objects.get(id=id)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)
        
        user = request.user
        
        # Check permissions: event creator OR circle members if event_shared=True
        is_creator = event.creator == user
        is_circle_member = False
        
        if event.event_shared and event.circles.exists():
            is_circle_member = event.circles.filter(members=user).exists()
        
        can_generate = is_creator or (event.event_shared and is_circle_member)
        
        if not can_generate:
            return Response(
                {"error": "Vous n'avez pas l'autorisation de générer des liens d'invitation pour cet événement"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate invitation token if doesn't exist
        if not event.invitation_token:
            event.invitation_token = generate_invitation_token()
            event.save()
        
        # Check if invitation circle exists
        invitation_circle = Circle.objects.filter(
            is_invitation_circle=True, 
            linked_event=event
        ).first()
        
        # Check if invitation circle exists - if not, return error
        if not invitation_circle:
            return Response({
                "error": "No invitation circle found for this event. The event must be created with invitation link enabled."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Add the current user to the existing invitation circle
        invitation_circle.members.add(user)
        
        # Link invitation circle to event
        event.circles.add(invitation_circle)
        
        # Generate invitation URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invitation_url = f"{frontend_url}/event/{event.id}?invite_token={event.invitation_token}"
        
        return Response({
            "invitation_url": invitation_url,
            "circle_id": invitation_circle.id,
            "token": event.invitation_token
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def accept_invite(self, request, id=None):
        """
        Accept an invitation to join the event's invitation circle.
        """
        
        event = self.get_object()
        
        invitation_token = request.data.get('invitation_token')
        if not invitation_token:
            return Response(
                {"detail": "invitation_token is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate token matches event's invitation token
        if event.invitation_token != invitation_token:
            return Response(
                {"detail": "Invalid invitation token."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find invitation circle for this event
        invitation_circle = Circle.objects.filter(
            is_invitation_circle=True, 
            linked_event=event
        ).first()
        
        if not invitation_circle:
            return Response(
                {"detail": "No invitation circle found for this event."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already a member
        is_already_member = invitation_circle.members.filter(id=request.user.id).exists()
        
        # Add user to invitation circle if not already a member
        if not is_already_member:
            invitation_circle.members.add(request.user)
        
        # Return event details
        serializer = self.get_serializer(event)
        
        return Response({
            "message": "Successfully joined the event invitation circle.",
            "event": serializer.data
        }, status=status.HTTP_200_OK)


class ProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user profiles.
    Provides CRUD operations for Profile model.
    """
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        """Return only the authenticated user's profile."""
        return Profile.objects.filter(user=self.request.user)

    def get_object(self):
        """Get the user's profile, creating it if it doesn't exist."""
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def perform_update(self, serializer):
        """Ensure the profile is associated with the current user."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """
        Special endpoint to get or update the current user's profile
        This allows for /api/events/profile/me/ endpoint
        """
        profile = self.get_object()

        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            # Use UserProfileSerializer to handle both user and profile updates
            serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Handle profile nested data
            profile_data = request.data.get('profile', {})
            if profile_data:
                profile = request.user.profile
                profile_serializer = ProfileSerializer(profile, data=profile_data, partial=True)
                profile_serializer.is_valid(raise_exception=True)
                profile_serializer.save()
            
            # Handle user-level fields (like username)
            if 'username' in request.data:
                request.user.username = request.data['username']
                request.user.save()
            
            # Return updated user profile
            user_serializer = UserProfileSerializer(request.user)
            return Response(user_serializer.data)


class ProfileByUserView(APIView):
    """
    Return a user's username and nested profile by username.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, username: str):
        user = get_object_or_404(User, username=username)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)


class CircleViewSet(viewsets.ModelViewSet):
    """
    Manage circles and their members.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "id"

    from .serializers import CircleSerializer  # local import to avoid circular
    serializer_class = CircleSerializer

    def get_queryset(self):
        user = self.request.user
        # Include regular circles (user created or member of, excluding invitation circles)
        return Circle.objects.filter(
            Q(creator=user) | Q(members=user)
        ).exclude(is_invitation_circle=True).prefetch_related('categories').select_related('creator').distinct()

    def perform_create(self, serializer):
        circle = serializer.save(creator=self.request.user)
        circle.members.add(self.request.user)

    def check_object_permissions(self, request, obj):
        if request.method in ["PUT", "PATCH", "DELETE"] and obj.creator != request.user:
            self.permission_denied(request, message="Only the creator can modify this circle.")

    @action(detail=True, methods=["post"])
    def add_members(self, request, id=None):
        circle = self.get_object()
        member_ids = request.data.get("member_ids", [])
        if not isinstance(member_ids, list):
            return Response({"detail": "member_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        if circle.creator != request.user:
            raise PermissionDenied("Only the creator can add members.")
        added, existing, errors = [], [], []
        for uid in member_ids:
            user = get_object_or_404(circle.members.model, id=uid)
            if circle.members.filter(id=user.id).exists():
                existing.append(user.id)
            else:
                circle.members.add(user)
                added.append(user.id)
        return Response({"circle": circle.id, "added": added, "already_present": existing, "errors": errors})

    @action(detail=True, methods=["post"])
    def remove_members(self, request, id=None):
        circle = self.get_object()
        member_ids = request.data.get("member_ids", [])
        if not isinstance(member_ids, list):
            return Response({"detail": "member_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Allow creator to remove any members, or allow members to remove themselves
        is_creator = circle.creator == request.user
        if not is_creator:
            # Non-creators can only remove themselves
            if len(member_ids) != 1 or member_ids[0] != request.user.id:
                raise PermissionDenied("You can only remove yourself from this circle.")
            # Also verify the user is actually a member
            if not circle.members.filter(id=request.user.id).exists():
                raise PermissionDenied("You are not a member of this circle.")
        
        removed, errors = [], []
        for uid in member_ids:
            try:
                user = circle.members.get(id=uid)
                # Additional check: non-creators can only remove themselves
                if not is_creator and user.id != request.user.id:
                    errors.append(f"You cannot remove user {uid} from this circle.")
                    continue
                circle.members.remove(user)
                removed.append(user.id)
            except circle.members.model.DoesNotExist:
                errors.append(f"User {uid} not in circle")
        return Response({"circle": circle.id, "removed": removed, "errors": errors})


class UserAddressViewSet(viewsets.ModelViewSet):
    """
    Manage addresses of the authenticated user.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = UserAddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user).select_related("address")

    def create(self, request, *args, **kwargs):
        address_serializer = AddressSerializer(data=request.data)
        address_serializer.is_valid(raise_exception=True)
        address = address_serializer.save()
        ua = UserAddress.objects.create(user=request.user, address=address, label=request.data.get("label", ""))
        return Response(UserAddressSerializer(ua).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        user_address = get_object_or_404(UserAddress, user=request.user, id=kwargs.get("pk"))
        new_label = request.data.get("label")
        if new_label is None:
            return Response({"detail": "Label is required for update."}, status=status.HTTP_400_BAD_REQUEST)
        user_address.label = new_label
        user_address.save(update_fields=["label"])
        return Response(UserAddressSerializer(user_address).data)

    def destroy(self, request, *args, **kwargs):
        user_address = get_object_or_404(UserAddress, user=request.user, id=kwargs.get("pk"))
        address = user_address.address
        user_address.delete()
        # also delete address (since it's user-owned entry point)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MultiCircleMembersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        circle_ids = request.data.get("circle_ids", [])
        if not circle_ids:
            return Response({"error": "No circle IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Filter circles to only those the user is a member of or created
        user = request.user
        circles = Circle.objects.filter(
            Q(id__in=circle_ids) & (
                Q(creator=user) | 
                Q(members=user) |
                Q(is_invitation_circle=True)
            )
        ).distinct()

        # Only return error if no circles were found at all
        if not circles.exists():
            # Check if single or multiple circles for appropriate error message
            if len(circle_ids) == 1:
                return Response({"error": "Tu ne fais pas partie de ce cercle"}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({"error": "Tu ne fais pas partie de ces cercles"}, status=status.HTTP_404_NOT_FOUND)
        
        # Fetch members from the accessible circles
  # local import
        all_user_ids = set()
        for circle in circles:
            member_ids = circle.members.values_list('id', flat=True)
            all_user_ids.update(member_ids)
        
        users = User.objects.filter(id__in=all_user_ids)
        data = [{"id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name} for u in users]
        
        return Response(data)



# from django_ratelimit.decorators import ratelimit

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle] if not settings.DEBUG else []

    # @ratelimit(key='ip', rate='5/h', block=True)  # Limit to 5 requests per hour per IP
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        return Response({
            "access": str(access),
            "refresh": str(refresh),
            "username": user.username,
        }, status=status.HTTP_201_CREATED)

class ChangePasswordView(APIView):
    """
    View to change user password with old password verification
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password']
            
            # Verify old password
            if not request.user.check_password(old_password):
                return Response(
                    {'error': 'Le mot de passe actuel est incorrect.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update password
            request.user.set_password(new_password)
            request.user.save()
            
            return Response(
                {'message': 'Mot de passe mis à jour avec succès.'}, 
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

class MyLocationsView(APIView):
    """
    Return the authenticated user's saved locations (UserAddress) as a flat list
    of simple objects for map consumption.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_addresses = UserAddress.objects.filter(user=user).select_related("address")

        results = []
        for ua in user_addresses:
            addr = ua.address
            if not addr:
                continue
            results.append({
                "user_id_str": str(user.id),
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "label": ua.label or "",
                "address_line": addr.address_line,
                "lat": addr.latitude,
                "lng": addr.longitude,
            })

        return Response(results, status=status.HTTP_200_OK)


class FriendsListView(APIView):
    """
    Return a list of all users that can be added to circles.
    This provides a searchable list of users for the frontend.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        # Get all users except the current user
        users = User.objects.exclude(id=request.user.id).values(
            'id', 'username', 'first_name', 'last_name'
        ).order_by('username')

        # Convert to list of dictionaries
        friends_data = [
            {
                "id": user['id'],
                "username": user['username'],
                "first_name": user['first_name'] or '',
                "last_name": user['last_name'] or '',
            }
            for user in users
        ]

        return Response(friends_data, status=status.HTTP_200_OK)


class ICalDownloadView(APIView):
    """
    Generate and download a one-time .ics file with user's events.
    This is a static snapshot that won't update automatically.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get user's events (created + invited)
        user_circles = Circle.objects.filter(members=user)
        events = Event.objects.filter(
            Q(creator=user) | Q(circles__in=user_circles)
        ).distinct().select_related('address')

        # Filter by circles if specified
        circle_ids = request.query_params.getlist('circles')
        if circle_ids:
            events = events.filter(circles__id__in=circle_ids)

        # Create iCalendar object
        cal = Calendar()
        cal.add('prodid', '-//ZIGZAG//Events//EN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('method', 'PUBLISH')
        cal.add('x-wr-calname', f'ZIGZAG Events - {user.username}')
        cal.add('x-wr-timezone', 'Europe/Paris')

        # Add events to calendar - create dual events for each event
        for event in events:
            from datetime import timedelta
            
            # Helper function to create a calendar event
            def create_calendar_event(start_time, end_time, uid, summary):
                vevent = ICalEvent()
                vevent.add('summary', summary)
                vevent.add('dtstart', start_time)
                vevent.add('dtend', end_time)

                if event.description:
                    vevent.add('description', event.description)

                if event.address:
                    location_parts = []
                    if event.address.address_line:
                        location_parts.append(event.address.address_line)
                    if event.address.city:
                        location_parts.append(event.address.city)
                    if location_parts:
                        vevent.add('location', ', '.join(location_parts))

                # Add circles as categories
                if event.circles.exists():
                    categories = [circle.name for circle in event.circles.all()]
                    vevent.add('categories', categories)

                vevent.add('uid', uid)
                vevent.add('created', event.created_at)
                vevent.add('last-modified', event.updated_at)
                
                return vevent

            # Create first event (start time)
            start_end_time = event.start_time + timedelta(hours=2)
            start_event = create_calendar_event(
                event.start_time,
                start_end_time,
                f'zigzag-{event.id}-start@zigzag.com',
                f'{event.title} (Début)'
            )
            cal.add_component(start_event)

            # Create second event (end time) - only if end_time exists
            if event.end_time:
                end_end_time = event.end_time + timedelta(hours=2)
                end_event = create_calendar_event(
                    event.end_time,
                    end_end_time,
                    f'zigzag-{event.id}-end@zigzag.com',
                    f'{event.title} (Fin)'
                )
                cal.add_component(end_event)

        # Generate response
        response = HttpResponse(cal.to_ical(), content_type='text/calendar; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="zigzag-events-{user.username}.ics"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'

        return response




class CircleGreyEventsView(APIView):
    """
    Return grey events (only temporal information) for selected circles.
    Privacy protection: only shows when total unique members >= threshold.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        circle_ids = request.query_params.getlist('circle_ids')
        if not circle_ids:
            return Response({"error": "No circle IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Validate user is member of all requested circles
        circles = Circle.objects.filter(
            Q(id__in=circle_ids) & (Q(creator=user) | Q(members=user))
        ).distinct()

        found_ids = set(str(c.id) for c in circles)
        missing_ids = set(str(cid) for cid in circle_ids) - found_ids
        if missing_ids:
            return Response({"error": f"Circles not found or access denied: {', '.join(sorted(missing_ids))}"}, status=status.HTTP_404_NOT_FOUND)

        # Count total unique members across selected circles
        unique_member_ids = circles.values_list("members__id", flat=True).distinct()
        total_members = len(unique_member_ids)

        min_members = getattr(settings, 'CIRCLE_CALENDAR_MIN_MEMBERS', 15)
        if total_members < min_members:
            return Response({
                "error": f"Not enough members to display events. Need at least {min_members} members."
            }, status=status.HTTP_403_FORBIDDEN)

        # Get member IDs from selected circles
        member_ids = list(unique_member_ids)
        
        # Get events from selected circles (only temporal data)
        events_from_circles = Event.objects.filter(circles__in=circles).distinct()
        
        # Get solo events where creator is a member of selected circles and has no circles
        solo_events = Event.objects.filter(
            creator__id__in=member_ids,
            circles__isnull=True
        ).distinct()
        
        # Combine both sets of events and filter by duration < 24 hours at database level
        from datetime import timedelta
        events = (events_from_circles | solo_events).filter(
            Q(end_time__lt=F('start_time') + timedelta(hours=24))
        ).distinct()

        # Serialize only temporal information
        serializer = GreyEventSerializer(events, many=True)

        return Response({
            "grey_events": serializer.data,
            "total_members": total_members,
            "selected_circles": len(circles)
        }, status=status.HTTP_200_OK)


class ThrottledTokenObtainPairView(APIView):
    """
    Throttled version of TokenObtainPairView for login rate limiting.
    Supports login with either username or email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle] if not settings.DEBUG else []

    def post(self, request, *args, **kwargs):
        # Extract identifier (could be username or email)
        identifier = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')
        
        if not identifier or not password:
            return Response(
                {"detail": "username or email and password required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find user by username or email
        
        # Try username first, then email
        user = User.objects.filter(username=identifier).first() or \
               User.objects.filter(email__iexact=identifier).first()
        
        if user and user.check_password(password):
            # User found and password matches
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        else:
            # Invalid credentials
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )


class PasswordResetRequestView(APIView):
    """
    Handle password reset requests.
    Sends email with reset link containing uid and token.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle] if not settings.DEBUG else []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Get user by email
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Return success even if user doesn't exist (security best practice)
            return Response(
                {"message": "Si cette adresse email existe dans notre système, vous recevrez un email avec les instructions de réinitialisation."},
                status=status.HTTP_200_OK
            )

        # Generate reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create reset link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/password-reset-confirm/{uid}/{token}/"

        # Send email
        # Note: In AWS SES sandbox, you can only send emails TO verified addresses
        # The "from" address must also be verified
        try:
            # Plain text version
            plain_text = f"""Bonjour {user.username},

Vous avez demandé à réinitialiser votre mot de passe pour votre compte.

Pour continuer, veuillez cliquer sur le lien suivant :

{reset_link}

Important : Ce lien est valide pendant 1 heure seulement.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité."""
            
            # HTML version
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <p style="font-size: 16px;">Bonjour {user.username},</p>
    
    <p style="font-size: 16px;">Vous avez demandé à réinitialiser votre mot de passe pour votre compte.</p>
    
    <p style="font-size: 16px;">Pour continuer, veuillez cliquer sur le bouton ci-dessous :</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" 
           style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
            Réinitialiser mon mot de passe
        </a>
    </div>
    
    <p style="font-size: 14px; color: #e74c3c;"><strong>Important :</strong> Ce lien est valide pendant 1 heure seulement.</p>
    
    <p style="font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
    
    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #95a5a6; text-align: center;">
        © ZigZag team - Tous droits réservés
    </p>
</body>
</html>"""
            # Configure message with proper headers to improve deliverability
            message = AnymailMessage(
                subject="Réinitialisation de votre mot de passe",
                body=plain_text,
                to=[user.email],
                from_email=settings.DEFAULT_FROM_EMAIL,
            )
            
            # Add headers to improve deliverability and avoid spam
            message.extra_headers = {
                'Reply-To': settings.DEFAULT_FROM_EMAIL,
                'X-Mailer': 'Password Reset Service',
            }
            
            # Attach HTML alternative
            message.attach_alternative(html_content, "text/html")
            
            message.send()
            
        except Exception as e:
            error_message = str(e)
            print(f"Error sending password reset email: {error_message}")
            
            # In sandbox, return success even on error (security best practice)
            # But log the actual error for debugging
            import traceback
            traceback.print_exc()
            
            # In DEBUG mode, return the actual error so user can see what went wrong
            if settings.DEBUG:
                return Response(
                    {
                        "error": "Failed to send email",
                        "details": error_message,
                        "note": "En mode sandbox, l'email FROM doit être vérifié dans AWS SES"
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {"message": "Si cette adresse email existe dans notre système, vous recevrez un email avec les instructions de réinitialisation."},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    Handle password reset confirmation.
    Validates token and updates user password.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle] if not settings.DEBUG else []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Lien de réinitialisation invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if token is valid
        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Lien de réinitialisation invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"message": "Votre mot de passe a été réinitialisé avec succès."},
            status=status.HTTP_200_OK
        )


class ContactView(APIView):
    """
    Handle contact form submissions.
    Sends email via Mailgun to HOST_EMAIL with contact form data.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle] if not settings.DEBUG else []

    def post(self, request):
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        name = serializer.validated_data.get('name', '')
        email = serializer.validated_data['email']
        message = serializer.validated_data['message']
        
        # Get HOST_EMAIL from environment
        host_email = os.getenv('HOST_EMAIL')
        if not host_email:
            # In production, log error but don't reveal to user (security best practice)
            if settings.DEBUG:
                return Response(
                    {"error": "HOST_EMAIL not configured"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            # In production, return success even if email fails
            return Response(
                {"message": "Votre message a été envoyé avec succès."},
                status=status.HTTP_200_OK
            )
        
        try:
            # Create plain text email content
            sender_name = name if name else "Anonyme"
            plain_text = f"""Nouveau message de contact ZIGZAG

Nom: {sender_name}
Email: {email}

Message:
{message}

---
Ce message a été envoyé depuis le formulaire de contact ZIGZAG.
Vous pouvez répondre directement à cet email pour contacter {sender_name}."""
            
            # Create HTML email content
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h2 style="color: #3498db;">Nouveau message de contact ZIGZAG</h2>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Nom:</strong> {sender_name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
    </div>
    
    <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap;">{message}</p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #95a5a6; text-align: center;">
        Ce message a été envoyé depuis le formulaire de contact ZIGZAG.<br>
        Vous pouvez répondre directement à cet email pour contacter {sender_name}.
    </p>
</body>
</html>"""
            
            # Configure message with proper headers
            message = AnymailMessage(
                subject="Nouveau message de contact ZIGZAG",
                body=plain_text,
                to=[host_email],
                from_email=settings.DEFAULT_FROM_EMAIL,
                reply_to=[email],  # Set Reply-To to sender's email for easy replies
            )
            
            # Add headers to improve deliverability
            message.extra_headers = {
                'Reply-To': email,
                'X-Mailer': 'ZIGZAG Contact Form',
            }
            
            # Attach HTML alternative
            message.attach_alternative(html_content, "text/html")
            
            message.send()
            
        except Exception as e:
            error_message = str(e)
            print(f"Error sending contact form email: {error_message}")
            
            # In DEBUG mode, return the actual error so user can see what went wrong
            if settings.DEBUG:

                # Log error for debugging
                import traceback
                traceback.print_exc()
                
                return Response(
                    {
                        "error": "Failed to send email",
                        "details": error_message,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Return success response (even on email errors, for security best practice)
        return Response(
            {"message": "Votre message a été envoyé avec succès."},
            status=status.HTTP_200_OK
        )
