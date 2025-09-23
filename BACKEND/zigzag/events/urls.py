from django.urls import path
from .views import EventViewSet

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
    path('event/<uuid:id>/participants/', EventViewSet.as_view({'get': 'participants'}), name='event-participants'),
    path('markers/', EventViewSet.as_view({'post': 'markers'}), name='user-markers'),
]
