from django.test import TestCase
#https://docs.djangoproject.com/en/5.2/topics/testing/overview/


# Create your tests here.
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from django.urls import reverse

from events.models import (
    User, Profile, Address, UserAddress, Tag, Circle,
    Event, EventParticipation,
)

class BaseModelSetup(TestCase):
    """Reusable setup for database objects."""

    def setUp(self):
        # --- Users ---
        self.user1 = User.objects.create_user(username="Harry", password="testpass")
        self.user2 = User.objects.create_user(username="Letizia", password="testpass")

        # Profiles are auto-created if using signals, but here we create explicitly
        self.profile1 = Profile.objects.create(user=self.user1)
        self.profile2 = Profile.objects.create(user=self.user2)

        # --- Address ---
        self.address = Address.objects.create(
            address_line="42 Rue de Rivoli",
            city="Paris",
            state="IL",
            country="FR",
            postal_code="75000",
            latitude=39.7817,
            longitude=-89.6501,
        )
        UserAddress.objects.create(user=self.user1, address=self.address, label="Home")

        # --- Categories & Circle ---
        self.tag = Tag.objects.create(name="ALUMNI")
        self.circle = Circle.objects.create(name="Friends", creator=self.user1)
        self.circle.members.set([self.user1, self.user2])
        self.circle.categories.add(self.tag)

        # --- Event ---
        start_time = make_aware(datetime.now())
        end_time = start_time + timedelta(hours=2)
        self.event = Event.objects.create(
            title="Soirée multisports",
            description="Tester plein de sports différents",
            address=self.address,
            start_time=start_time,
            end_time=end_time,
            creator=self.user1,
            is_public=True,
        )
        self.event.circles.add(self.circle)

        # --- EventParticipation ---
        EventParticipation.objects.create(event=self.event, user=self.user2)

        # Authenticate
        self.client.login(username="Harry", password="pass123")

    def test_event_and_participation(self):
        # Verify relationships
        self.assertEqual(self.event.creator, self.user1)
        self.assertIn(self.circle, self.event.circles.all())
        self.assertEqual(self.event.participants.count(), 1)

    def test_list_events(self):
        url = reverse("event-list")
        response = self.client.get(url)
        self.assertTrue(any(e["title"] == "Soirée multisports" for e in response.data))
