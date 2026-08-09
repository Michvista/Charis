from django.contrib.auth.models import AbstractUser
from django.db import models
from common.models import TimeStampedModel

class User(AbstractUser, TimeStampedModel):
    # Ensures email is unique 
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)

    # Use email for login instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email or self.username