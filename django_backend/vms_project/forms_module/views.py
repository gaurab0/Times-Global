from rest_framework import viewsets
import django_filters
from .models import DeviceStorageEntry, GatePass
from .serializers import DeviceStorageEntrySerializer, GatePassSerializer
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import PermissionDenied


class DeviceStorageEntryFilter(django_filters.FilterSet):
    company_name = django_filters.CharFilter(field_name='submitter_company_name', lookup_expr='icontains')

    class Meta:
        model = DeviceStorageEntry
        fields = ['company_name']


class GatePassFilter(django_filters.FilterSet):
    recipient_name = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = GatePass
        fields = ['recipient_name']


class BaseLocationScopedViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        location_id_filter = self.request.query_params.get('location_id')

        if not user.is_approved_by_admin:
            return self.queryset.model.objects.none()

        authorized_location_ids = user.authorized_locations.values_list('id', flat=True)
        if not authorized_location_ids:
            return self.queryset.model.objects.none() 

        queryset = super().get_queryset().filter(location_id__in=authorized_location_ids)

        if location_id_filter:
            try:
                location_id_filter_int = int(location_id_filter)
                if location_id_filter_int not in authorized_location_ids:
                    return self.queryset.model.objects.none()
                return queryset.filter(location_id=location_id_filter_int)
            except ValueError:
                return self.queryset.model.objects.none()
        
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        
        if not user.is_authenticated or not user.is_approved_by_admin: 
            raise PermissionDenied("User not approved or not authenticated for creating entries.")

        location_instance = serializer.validated_data.get('location') 
        if not location_instance:
             raise PermissionDenied("Location is required and was not provided correctly.") 

        authorized_location_ids = user.authorized_locations.values_list('id', flat=True)
        if location_instance.id not in authorized_location_ids:
            raise PermissionDenied("User not authorized to create entries for this location.")
        
        user_full_name = user.get_full_name()
        user_email = user.email
        
        if not user_full_name and user.username: 
            user_full_name = user.username
            
        print(f"DEBUG (perform_create): User '{user.username}' (Name: '{user_full_name}', Email: '{user_email}') is creating a record for location '{location_instance.name}'.")
            
        serializer.save(
            created_by_name=user_full_name, 
            created_by_email=user_email
            # Optional: If you added created_by_user ForeignKey to models:
            # created_by_user=user 
        )

class DeviceStorageEntryViewSet(BaseLocationScopedViewSet):
    queryset = DeviceStorageEntry.objects.all().order_by('-date')
    serializer_class = DeviceStorageEntrySerializer
    filterset_class = DeviceStorageEntryFilter

class GatePassViewSet(BaseLocationScopedViewSet):
    queryset = GatePass.objects.all().order_by('-pass_date')
    serializer_class = GatePassSerializer
    filterset_class = GatePassFilter
