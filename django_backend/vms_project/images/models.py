# StoredImage model is kept global as per thought process (user profile images).
# No location ForeignKey here.
from django.db import models
import re

def image_upload_path(instance, filename):
    identifier = instance.email if instance.email else instance.fullName.replace(" ", "_")
    identifier = re.sub(r'[^a-zA-Z0-9_.-]', '_', identifier)
    return f'stored_images/{instance.idType.lower()}/{identifier}/{filename}'

class StoredImage(models.Model):
    ID_TYPE_CHOICES = [
        ('Visitor', 'Visitor'),
        ('Staff', 'Staff'),
        ('Contractor', 'Contractor'),
        ('Other', 'Other'),
    ]
    fullName = models.CharField(max_length=255, verbose_name="Full Name")
    contact = models.CharField(max_length=50, blank=True, null=True, verbose_name="Contact Number")
    email = models.EmailField(blank=True, null=True, verbose_name="Email Address")
    
    imageFile = models.ImageField(upload_to=image_upload_path, verbose_name="Image File")
    idType = models.CharField(max_length=50, choices=ID_TYPE_CHOICES, default='Visitor', verbose_name="ID Type")
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Image of {self.fullName} ({self.idType})"

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Stored Image (User Registration)"
        verbose_name_plural = "Stored Images (User Registrations)"
