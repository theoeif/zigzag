# serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import Event, Address, Circle, UserAddress, EventInvitation, User, Tag

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'address_line', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']

class CircleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Circle
        fields = ['id', 'name', 'categories']

class EventSerializer(serializers.ModelSerializer):
    address = AddressSerializer(read_only=True)
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
                  'creator', 'circles','circle_ids', 'shareable_link', 'participants_count']

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


from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Create user as inactive
        user = User.objects.create(
            username=validated_data["username"],
            is_active=False  # Require email confirmation
        )
        user.set_password(validated_data["password"])
        user.save()

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

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]
