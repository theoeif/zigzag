# serializers.py
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Event, Address, Circle, UserAddress, User, Tag, Profile

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'address_line', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']

class CircleSerializer(serializers.ModelSerializer):
    creator = serializers.StringRelatedField(read_only=True)
    tags = serializers.StringRelatedField(source='categories', many=True, read_only=True)
    is_invitation_circle = serializers.BooleanField(read_only=True)
    linked_event = serializers.PrimaryKeyRelatedField(read_only=True)
    is_creator = serializers.SerializerMethodField()

    class Meta:
        model = Circle
        fields = ['id', 'name', 'creator', 'categories', 'tags', 'is_invitation_circle', 'linked_event', 'is_creator']
    
    def get_is_creator(self, obj):
        """Return True if the current user created this circle"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.creator == request.user
        return False

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
    creator = serializers.StringRelatedField(read_only=True)
    can_generate_invite = serializers.SerializerMethodField()

    circle_ids = serializers.PrimaryKeyRelatedField(
        source='circles',
        many=True,
        queryset=Circle.objects.all(),
        write_only=True
    )
    
    invitation_token = serializers.CharField(write_only=True, required=False)
    has_invitation_link = serializers.SerializerMethodField()
    generate_invitation_link = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'address', 'start_time', 'end_time',
                  'circles','circle_ids', 'shareable_link', 'event_shared', 'invitation_token', 'has_invitation_link', 'generate_invitation_link', 'creator', 'can_generate_invite']
    
    def get_has_invitation_link(self, obj):
        return bool(obj.invitation_token)
    
    def get_can_generate_invite(self, obj):
        """Check if current user can generate invitation links for this event"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # User can generate invite if:
        # 1. They are the creator, OR
        # 2. Event is shared AND user is a member of any associated circle
        is_creator = obj.creator == request.user
        
        is_circle_member = False
        if obj.event_shared and obj.circles.exists():
            is_circle_member = obj.circles.filter(members=request.user).exists()
        
        has_valid_token = obj.invitation_token and obj.invitation_token.strip()

        return (is_creator or (obj.event_shared and is_circle_member)) and has_valid_token

# TODO replace functionnality of circle_ids in the front as well
# TODO change name categories to tags everywhere.


class UserAddressSerializer(serializers.ModelSerializer):
    """Serialize UserAddress with nested Address (read-only)."""
    id = serializers.IntegerField(read_only=True)
    address = AddressSerializer(read_only=True)

    class Meta:
        model = UserAddress
        fields = ['id', 'label', 'address']





class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    timezone = serializers.CharField(write_only=True, required=False, default='UTC')
    utc_offset_minutes = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "timezone", "utc_offset_minutes")

    def validate_username(self, value):
        """Normalize and validate username"""
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        
        # Strip whitespace from username
        value = value.strip()
        
        # Check for empty string after trimming
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        
        # Check if username already exists (case-insensitive comparison to avoid duplicates)
        # This handles cases like "Test " vs "test" vs "test"
        existing_user = User.objects.filter(username__iexact=value.strip()).first()
        if existing_user:
            raise serializers.ValidationError("A user with that username already exists. Usernames may not include spaces.")
        
        # Basic length validation
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        if len(value) > 150:
            raise serializers.ValidationError("Username cannot exceed 150 characters.")
        
        return value

    def validate_email(self, value):
        """Validate email uniqueness and format"""
        if not value:
            raise serializers.ValidationError("Email cannot be empty.")
        
        # Check if email already exists (case-insensitive)
        existing_user = User.objects.filter(email__iexact=value).first()
        if existing_user:
            raise serializers.ValidationError("A user with that email already exists.")
        
        return value.lower()  # Normalize to lowercase

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Extract timezone fields if provided
        tz = validated_data.pop("timezone", "UTC")
        offset = validated_data.pop("utc_offset_minutes", 0)
        email = validated_data.pop("email")

        # Create user as active (no email confirmation required for now)
        user = User.objects.create(
            username=validated_data["username"],
            email=email,
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


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Check if email exists in the system"""
        from .models import User
        try:
            user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            # Don't reveal if email exists or not (security best practice)
            # Return a generic message
            raise serializers.ValidationError("Si cette adresse email existe dans notre système, vous recevrez un email avec les instructions de réinitialisation.")
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    uid = serializers.CharField(required=True, help_text="User ID in base64 format")
    token = serializers.CharField(required=True, help_text="Password reset token")
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs


class ContactFormSerializer(serializers.Serializer):
    """Serializer for contact form submission"""
    name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    email = serializers.EmailField(required=True)
    message = serializers.CharField(required=True, max_length=5000)
