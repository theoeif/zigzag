from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import User, UserAddress, Address, Tag, Circle, Event

# Unregister default Group to avoid confusion since you don’t use it directly
admin.site.unregister(Group)

# ----- USER ADMIN -----

class UserAddressInline(admin.TabularInline):
    model = UserAddress
    extra = 1

class CustomUserAdmin(UserAdmin):
    inlines = [UserAddressInline]
    fieldsets = (
        ('Personal Info', {
            'fields': ('username', 'password', 'first_name', 'last_name', 'email'),
        }),
        ('Friends', {'fields': ('friends_section',)}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
        }),
    )
    readonly_fields = ('friends_section',)

    list_display = ('username', 'email', 'first_name', 'last_name', 'friends_count')

    def friends_count(self, obj):
        """Count all unique users sharing any circle with this user."""
        return (
            User.objects
            .filter(circles__in=obj.circles.all())
            .exclude(id=obj.id)
            .distinct()
            .count()
        )
    friends_count.short_description = 'Number of Friends'

    def friends_section(self, obj):
        """Comma-separated usernames of friends."""
        friends = (
            User.objects
            .filter(circles__in=obj.circles.all())
            .exclude(id=obj.id)
            .distinct()
        )
        return ", ".join(f.username for f in friends) if friends else "No friends"
    friends_section.short_description = 'Friends'

admin.site.register(User, CustomUserAdmin)

# ----- OTHER MODELS -----
admin.site.register(Address)
admin.site.register(Tag)

# ----- CIRCLE ADMIN -----
class CircleAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'is_invitation_circle', 'linked_event', 'get_categories', 'get_members_count']
    list_filter = ['is_invitation_circle', 'creator']
    search_fields = ['name', 'creator__username']
    filter_horizontal = ['categories', 'members']  # This makes it easier to manage many-to-many fields
    
    def get_categories(self, obj):
        return ", ".join([tag.name for tag in obj.categories.all()])
    get_categories.short_description = 'Tags'
    
    def get_members_count(self, obj):
        return obj.members.count()
    get_members_count.short_description = 'Members'

admin.site.register(Circle, CircleAdmin)

# ----- EVENT ADMIN -----

class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'get_address', 'get_lat', 'get_lng']
    search_fields = ['title', 'description', 'address__address_line']
    list_filter = ['created_at']

    def get_address(self, obj):
        return obj.address.address_line if obj.address else "-"
    get_address.short_description = 'Address'

    def get_lat(self, obj):
        return obj.address.latitude if obj.address else "-"
    get_lat.short_description = 'Latitude'

    def get_lng(self, obj):
        return obj.address.longitude if obj.address else "-"
    get_lng.short_description = 'Longitude'

admin.site.register(Event, EventAdmin)
