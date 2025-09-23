import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user (keeps default fields from AbstractUser)."""

    def __str__(self):
        return self.username


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    timetable = models.JSONField(default=dict, blank=True, null=True)
    remote_days_count = models.IntegerField(default=0)
    remote_days = models.JSONField(default=dict, blank=True, null=True)
    vacation_days_remaining = models.IntegerField(default=0)
    vacation_start = models.DateField(null=True, blank=True)
    vacation_end = models.DateField(null=True, blank=True)
    looking_for = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def save(self, *args, **kwargs):
        if not self.timetable:
            self.timetable = {
                "Monday": {"start": None, "end": None},
                "Tuesday": {"start": None, "end": None},
                "Wednesday": {"start": None, "end": None},
                "Thursday": {"start": None, "end": None},
                "Friday": {"start": None, "end": None},
                "Saturday": {"start": None, "end": None},
                "Sunday": {"start": None, "end": None},
            }
        if not self.remote_days:
            self.remote_days = {
                "Monday": False,
                "Tuesday": False,
                "Wednesday": False,
                "Thursday": False,
                "Friday": False,
                "Saturday": False,
                "Sunday": False,
            }
        super().save(*args, **kwargs)


class Address(models.Model):
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional: owners relation via UserAddress
    owners = models.ManyToManyField(User, through='UserAddress', related_name='addresses', blank=True)

    def __str__(self):
        return self.address_line


class UserAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    address = models.ForeignKey(Address, on_delete=models.CASCADE)
    label = models.CharField(max_length=100, blank=True, null=True)  # e.g., Home, Work

    class Meta:
        unique_together = ('user', 'address')


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Circle(models.Model):
    """Group of users (a "circle" of friends)."""
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_circles')

    # simple members relation (no through model). Add through later if you need roles/metadata.
    members = models.ManyToManyField(User, related_name='circles', blank=True)

    # categories for filtering circles
    categories = models.ManyToManyField(Tag, related_name='circles', blank=True)

    def __str__(self):
        return self.name


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, related_name='events', blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')

    # link events to circles directly; no through table unless extra metadata required
    circles = models.ManyToManyField(Circle, related_name='events', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shareable_link = models.BooleanField(default=True)

    def __str__(self):
        return self.title

    @property
    def participants_count(self):
        return self.participants.count()


class EventParticipation(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_participations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.username} participating in {self.event.title}"


class EventInvitation(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Invitation for {self.event.title} to {self.email}"

    @property
    def invitation_link(self):
        return f"http://localhost:5173/event/{self.event.id}?invite={self.token}"
