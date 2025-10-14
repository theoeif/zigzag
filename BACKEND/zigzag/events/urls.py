from django.urls import path
from .views import (
    EventViewSet,
    CircleViewSet,
    UserAddressViewSet,
    MultiCircleMembersView,
    EventInvitationViewSet,
    VerifyInvitationView,
    AcceptInvitationView,
    EventShareTokenView,
    TagListView,
    MyLocationsView,
    ProfileViewSet,
    FriendsListView,
    ProfileByUserView,
    ICalDownloadView,
    ICalFeedView,
    CircleGreyEventsView,
)

# ViewSet mappings
event_list = EventViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

event_detail = EventViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

urlpatterns = [
    path('event/', event_list, name='event-list'),
    path('event/<uuid:id>/', event_detail, name='event-detail'),
    path('markers/', EventViewSet.as_view({'post': 'markers'}), name='user-markers'),

    # Profile endpoints
    path('profile/', ProfileViewSet.as_view({'get': 'list', 'post': 'create'}), name='profile-list'),
    path('profile/<int:pk>/', ProfileViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='profile-detail'),
    path('profile/me/', ProfileViewSet.as_view({'get': 'me', 'patch': 'me'}), name='profile-me'),
    path('users/<str:username>/profile/', ProfileByUserView.as_view(), name='user-profile-by-username'),

    # User Address endpoints
    path('user/addresses/', UserAddressViewSet.as_view({'get': 'list', 'post': 'create'}), name='user-address-list'),
    path('user/addresses/<int:pk>/', UserAddressViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='user-address-detail'),

    # Circle endpoints
    path('circles/', CircleViewSet.as_view({'get': 'list', 'post': 'create'}), name='circle-list'),
    path('circles/<int:id>/', CircleViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='circle-detail'),
    path('circles/<int:id>/add_members/', CircleViewSet.as_view({'post': 'add_members'}), name='circle-add-members'),
    path('circles/<int:id>/remove_members/', CircleViewSet.as_view({'post': 'remove_members'}), name='circle-remove-members'),
    path('circles/members/', MultiCircleMembersView.as_view(), name='multi_circle_members'),
    path('circles/grey-events/', CircleGreyEventsView.as_view(), name='circle-grey-events'),
    path('tags/', TagListView.as_view(), name='tag-list'),
    path('my/locations/', MyLocationsView.as_view(), name='my-locations'),
    path('users/', FriendsListView.as_view(), name='users-list'),


    # Invitation endpoints
    path('invitations/', EventInvitationViewSet.as_view({'get': 'list', 'post': 'create'}), name='invitation-list'),
    path('invitations/<int:pk>/', EventInvitationViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='invitation-detail'),
    path('verify-invitation/', VerifyInvitationView.as_view(), name='verify-invitation'),
    path('accept-invitation/', AcceptInvitationView.as_view(), name='accept-invitation'),
    path('event-share-token/', EventShareTokenView.as_view(), name='event-share-token'),

    # iCal export endpoints
    path('ical/download/', ICalDownloadView.as_view(), name='ical-download'),
    path('ical/feed/', ICalFeedView.as_view(), name='ical-feed'),
]
