# serializers.py
from rest_framework import serializers
from .models import Event, Address, Circle

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

    circle_ids = serializers.PrimaryKeyRelatedField(
        source='circles',
        many=True, 
        queryset=Circle.objects.all(),
        write_only=True
    )

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'address', 'start_time', 'end_time',
                  'creator', 'circles','circle_ids', 'shareable_link']

# TODO replace functionnality of circle_ids in the front as well 
# TODO change name categories to tags everywhere.