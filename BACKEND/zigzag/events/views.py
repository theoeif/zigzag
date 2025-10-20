from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.conf import settings
from icalendar import Calendar, Event as ICalEvent

from .models import (
    Event,
    Circle,
    Address,
    UserAddress,
    Tag,
    Profile,
)
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
)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for event CRUD, permissions, and private markers.
    """
    serializer_class = EventSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "id"

    def get_queryset(self):
        """
        Return a standard queryset for CRUD operations.
        Grouping for the project view is handled in list().
        """
        user = self.request.user
        user_circles = Circle.objects.filter(members=user)
        return Event.objects.filter(Q(creator=user) | Q(circles__in=user_circles)).distinct()

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

        # Create the event
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Save with the created address if one was made
        if created_address:
            event = serializer.save(creator=self.request.user, address=created_address)
        else:
            event = serializer.save(creator=self.request.user)

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
        event_data = {k: v for k, v in request.data.items() if k != "address"}  # Exclude address from event update

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

        # Return the updated event
        response_serializer = self.get_serializer(event)
        return Response(response_serializer.data)

    # patch only address of the event
    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        self.check_object_permissions(request, event)

        address_data = request.data.get("address", None)
        event_data = {k: v for k, v in request.data.items() if k != "address"}  # Exclude address from event update

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
        """
        user = request.user
        tags_param = request.data.get("tags", [])
        user_circles = Circle.objects.filter(members=user)

        events = Event.objects.filter(Q(creator=user) | Q(circles__in=user_circles)).distinct()

        # If tags are provided, filter by circle categories
        if tags_param and len(tags_param) > 0:
            # Get events that have circles with the specified tags
            events_with_circles = events.filter(circles__categories__id__in=tags_param).distinct()

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

        markers = []
        for e in events.select_related("address").prefetch_related("circles__categories"):
            # Get all tags from all circles associated with this event
            event_tags = []
            for circle in e.circles.all():
                event_tags.extend([tag.name for tag in circle.categories.all()])

            # Remove duplicates
            event_tags = list(set(event_tags))

            markers.append({
                "id": e.id,
                "title": e.title,
                "lat": e.address.latitude if e.address else None,
                "lng": e.address.longitude if e.address else None,
                "address_line": e.address.address_line if e.address else None,
                "description": e.description,
                "start_date": e.start_time,
                "end_date": e.end_time,
                "tags": event_tags,
            })

        return Response({"private_markers": markers}, status=status.HTTP_200_OK)


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
        from .models import User  # local import to avoid circular imports
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
        # Circles user created or is a member of
        return Circle.objects.filter(Q(creator=user) | Q(members=user)).distinct()

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
        if circle.creator != request.user:
            raise PermissionDenied("Only the creator can remove members.")
        removed, errors = [], []
        for uid in member_ids:
            try:
                user = circle.members.get(id=uid)
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
            Q(id__in=circle_ids) & (Q(creator=user) | Q(members=user))
        ).distinct()

        found_ids = set(str(c.id) for c in circles)
        missing_ids = set(str(cid) for cid in circle_ids) - found_ids
        if missing_ids:
            return Response({"error": f"Circles not found: {', '.join(sorted(missing_ids))}"}, status=status.HTTP_404_NOT_FOUND)
        user_ids = circles.values_list("members__id", flat=True).distinct()
        from .models import User  # local import
        users = User.objects.filter(id__in=user_ids)
        data = [{"id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name} for u in users]
        return Response(data)



# from django_ratelimit.decorators import ratelimit
from rest_framework_simplejwt.tokens import RefreshToken

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

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
        from .models import User  # local import to avoid circular imports

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

        # Get all events from selected circles (only temporal data)
        events = Event.objects.filter(circles__in=circles).distinct()

        # Serialize only temporal information
        serializer = GreyEventSerializer(events, many=True)

        return Response({
            "grey_events": serializer.data,
            "total_members": total_members,
            "selected_circles": len(circles)
        }, status=status.HTTP_200_OK)
