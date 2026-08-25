from rest_framework import serializers
from .models import DeviceStorageEntry, DeviceStorageItem, GatePass, GatePassItem
from .emails import send_gatepass_email
from locations.models import Location 
from locations.serializers import LocationSerializer 
from datetime import date, datetime 
from django.utils import timezone 


# Device Storage Serializers
class DeviceStorageItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceStorageItem
        fields = ['sno', 'quantity', 'description', 'rackNo', 'remarks']

class DeviceStorageEntrySerializer(serializers.ModelSerializer):
    items = DeviceStorageItemSerializer(many=True)
    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), source='location', write_only=True
    )
    date = serializers.DateField(format="%Y-%m-%d", input_formats=['%Y-%m-%d', 'iso-8601'])

    class Meta:
        model = DeviceStorageEntry
        fields = [
            'id', 'location', 'location_id', 'company_name', 'date', 'office_address', 'items',
            'submitter_name', 'submitter_company_name', 'submitter_designation',
            'submitter_contact', 'submitter_signature', 'prepared_by_signature',
            'created_by_name', 'created_by_email', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ('id', 'created_by_name', 'created_by_email', 'created_at', 'updated_at') 

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        entry = DeviceStorageEntry.objects.create(**validated_data)
        for item_data in items_data:
            DeviceStorageItem.objects.create(entry=entry, **item_data)
        return entry

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        instance.location = validated_data.get('location', instance.location)
        instance.company_name = validated_data.get('company_name', instance.company_name)
        instance.date = validated_data.get('date', instance.date)
        instance.office_address = validated_data.get('office_address', instance.office_address)
        instance.submitter_name = validated_data.get('submitter_name', instance.submitter_name)
        instance.submitter_company_name = validated_data.get('submitter_company_name', instance.submitter_company_name)
        instance.submitter_designation = validated_data.get('submitter_designation', instance.submitter_designation)
        instance.submitter_contact = validated_data.get('submitter_contact', instance.submitter_contact)
        instance.submitter_signature = validated_data.get('submitter_signature', instance.submitter_signature)
        instance.prepared_by_signature = validated_data.get('prepared_by_signature', instance.prepared_by_signature)
             
        instance.save()

        if items_data is not None:
            instance.items.all().delete() 
            for item_data in items_data:
                DeviceStorageItem.objects.create(entry=instance, **item_data)
        
        return instance


# Gate Pass Serializers
class GatePassItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatePassItem
        fields = ['sno', 'itemName', 'description', 'quantity', 'remarks']

class GatePassSerializer(serializers.ModelSerializer):
    items = GatePassItemSerializer(many=True)
    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), source='location', write_only=True
    )
    pass_date = serializers.DateField(format="%Y-%m-%d", input_formats=['%Y-%m-%d', 'iso-8601'])

    class Meta:
        model = GatePass
        fields = [
            'id', 'location', 'location_id', 'recipient_name', 'recipient_address', 'items',
            'prepared_by', 'received_by', 'approved_by',
            'pass_date', 
            'created_by_name', 'created_by_email', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ('id', 'created_by_name', 'created_by_email', 'created_at', 'updated_at')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if hasattr(instance, 'pass_date') and instance.pass_date:
            if isinstance(instance.pass_date, datetime): 
                representation['pass_date'] = instance.pass_date.date().isoformat()
            elif isinstance(instance.pass_date, date):
                representation['pass_date'] = instance.pass_date.isoformat()
        return representation

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        gate_pass = GatePass.objects.create(**validated_data)
        print(f"DEBUG (Serializer Create): Gate pass ID {gate_pass.id}, pass_date type: {type(gate_pass.pass_date)}, value: {gate_pass.pass_date}")
        for item_data in items_data:
            GatePassItem.objects.create(gate_pass=gate_pass, **item_data)

        # Fire exactly once per issued pass, after the row and its items are
        # saved. send_gatepass_email never raises, so issuance can't fail
        # because of the notification.
        send_gatepass_email(gate_pass)

        return gate_pass
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        instance.location = validated_data.get('location', instance.location) 
        instance.recipient_name = validated_data.get('recipient_name', instance.recipient_name)
        instance.recipient_address = validated_data.get('recipient_address', instance.recipient_address)
        instance.prepared_by = validated_data.get('prepared_by', instance.prepared_by)
        instance.received_by = validated_data.get('received_by', instance.received_by)
        instance.approved_by = validated_data.get('approved_by', instance.approved_by)
        instance.pass_date = validated_data.get('pass_date', instance.pass_date)
        instance.save()

        if items_data is not None:
            instance.items.all().delete() 
            for item_data in items_data:
                GatePassItem.objects.create(gate_pass=instance, **item_data)
        
        return instance