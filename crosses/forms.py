from django import forms
from django.core.exceptions import ValidationError
from .models import Cross, CrossReview


class CrossForm(forms.ModelForm):
    class Meta:
        model = Cross
        fields = [
            'name', 'category', 'location', 'address', 'price', 'capacity',
            'image', 'image_url', 'facilities', 'rules', 'cancellation_policy', 'is_active'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Apex Central Cross Arena'}),
            'category': forms.Select(attrs={'class': 'form-select'}),
            'location': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'City or Zone (e.g. Downtown Metro)'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Full street address'}),
            'price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': '1', 'placeholder': 'e.g. 50.00'}),
            'capacity': forms.NumberInput(attrs={'class': 'form-control', 'min': '1', 'placeholder': 'e.g. 100'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
            'image_url': forms.URLInput(attrs={'class': 'form-control', 'placeholder': 'https://images.unsplash.com/... (optional)'}),
            'facilities': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Wi-Fi, Air Conditioning, Projector, Sound System, Restrooms, Parking'}),
            'rules': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'House rules and expectations'}),
            'cancellation_policy': forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Cancellation terms'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def clean_price(self):
        price = self.cleaned_data.get('price')
        if price is not None and price <= 0:
            raise ValidationError("Hourly price must be greater than zero.")
        return price

    def clean_capacity(self):
        capacity = self.cleaned_data.get('capacity')
        if capacity is not None and capacity <= 0:
            raise ValidationError("Capacity must be at least 1 person.")
        return capacity

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Validate file size (< 5MB)
            if image.size > 5 * 1024 * 1024:
                raise ValidationError("Image file size should not exceed 5MB.")
            # Validate extension
            valid_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
            ext = image.name.lower()
            if not any(ext.endswith(e) for e in valid_extensions):
                raise ValidationError("Unsupported image format. Use JPG, PNG, WEBP, or GIF.")
        return image


class CrossReviewForm(forms.ModelForm):
    class Meta:
        model = CrossReview
        fields = ['rating', 'comment']
        widgets = {
            'rating': forms.Select(attrs={'class': 'form-select'}),
            'comment': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Share your real experience with this Cross facility...'}),
        }
