# serializers.py
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Event, Address, Circle, UserAddress, EventInvitation, User, Tag, Profile

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'address_line', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']

class CircleSerializer(serializers.ModelSerializer):
    creator = serializers.StringRelatedField(read_only=True)
    tags = serializers.StringRelatedField(source='categories', many=True, read_only=True)

    class Meta:
        model = Circle
        fields = ['id', 'name', 'creator', 'categories', 'tags']

    def create(self, validated_data):
        # Handle categories (tags) during creation
        categories_data = validated_data.pop('categories', [])
        circle = Circle.objects.create(**validated_data)
        if categories_data:
            circle.categories.set(categories_data)
        return circle

    def update(self, instance, validated_data):
        # Handle categories (tags) update
        if 'categories' in validated_data:
            categories_data = validated_data.pop('categories')
            instance.categories.set(categories_data)

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

class EventSerializer(serializers.ModelSerializer):
    address = AddressSerializer(required=False, read_only=True)
    circles = CircleSerializer(many=True, read_only=True)
    participants_count = serializers.IntegerField(read_only=True)

    circle_ids = serializers.PrimaryKeyRelatedField(
        source='circles',
        many=True,
        queryset=Circle.objects.all(),
        write_only=True
    )

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'address', 'start_time', 'end_time',
                  'circles','circle_ids', 'shareable_link', 'event_shared', 'participants_count']

# TODO replace functionnality of circle_ids in the front as well
# TODO change name categories to tags everywhere.


class UserAddressSerializer(serializers.ModelSerializer):
    """Serialize UserAddress with nested Address (read-only)."""
    id = serializers.IntegerField(read_only=True)
    address = AddressSerializer(read_only=True)

    class Meta:
        model = UserAddress
        fields = ['id', 'label', 'address']


class EventInvitationSerializer(serializers.ModelSerializer):
    invitation_link = serializers.CharField(read_only=True)

    class Meta:
        model = EventInvitation
        fields = ['id', 'event', 'email', 'token', 'created_at', 'accepted', 'accepted_at', 'invitation_link']
        read_only_fields = ['token', 'created_at', 'accepted', 'accepted_at', 'invitation_link']



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    timezone = serializers.CharField(write_only=True, required=False, default='UTC')
    utc_offset_minutes = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model = User
        fields = ("username", "password", "password2", "timezone", "utc_offset_minutes")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Extract timezone fields if provided
        tz = validated_data.pop("timezone", "UTC")
        offset = validated_data.pop("utc_offset_minutes", 0)

        # Create user as active (no email confirmation required for now)
        user = User.objects.create(
            username=validated_data["username"],
            is_active=True  # User is immediately active
        )
        user.set_password(validated_data["password"])
        user.save()

        # Ensure profile exists and store timezone settings
        try:
            from .models import Profile
            if not hasattr(user, 'profile'):
                Profile.objects.create(user=user, timezone=tz, utc_offset_minutes=offset)
            else:
                prof = user.profile
                prof.timezone = tz
                prof.utc_offset_minutes = offset
                prof.save()
        except Exception:
            pass

        # TODO: Send verification email with activation link
        # Example: send_activation_email(user)
        # from django.core.mail import send_mail
        # from django.urls import reverse

        # def send_activation_email(user, request):
        #     token = account_activation_token.make_token(user)
        #     uid = user.pk
        #     activation_link = request.build_absolute_uri(
        #         reverse('activate', kwargs={'uid': uid, 'token': token})
        #     )
        #     send_mail(
        #         "Activate your account",
        #         f"Click the link to activate your account: {activation_link}",
        #         "noreply@yourapp.com",
        #         [user.email],
        #     )
        # from django.contrib.auth.tokens import PasswordResetTokenGenerator
        # account_activation_token = PasswordResetTokenGenerator()

        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id",
            "timetable",
            "remote_days",
            "vacation_days_remaining",
            "vacation_start",
            "vacation_end",
            "looking_for",
            "created_at",
            "updated_at",
            "timezone",
            "utc_offset_minutes",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "profile"]

    def validate_username(self, value):
        """Validate username uniqueness and format"""
        if not value:
            raise serializers.ValidationError("Le nom d'utilisateur ne peut pas être vide.")
        
        # Check if username already exists (excluding current user)
        if User.objects.filter(username=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        
        # Validate username format (alphanumeric, underscores, hyphens)
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            raise serializers.ValidationError("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores.")
        
        if len(value) < 3:
            raise serializers.ValidationError("Le nom d'utilisateur doit contenir au moins 3 caractères.")
        
        if len(value) > 150:
            raise serializers.ValidationError("Le nom d'utilisateur ne peut pas dépasser 150 caractères.")
        
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update Profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        instance.save()
        return instance


class GreyEventSerializer(serializers.ModelSerializer):
    """Serializer for grey events - only exposes temporal information for privacy."""

    class Meta:
        model = Event
        fields = ['start_time', 'end_time']
