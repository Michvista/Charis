
from typing import Any, cast

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User

class UserSerializer(serializers.ModelSerializer):
    # this serializer is for public user profile data
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'bio', 'avatar_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class RegisterSerializer(serializers.ModelSerializer):
    # serializer for handling new user reg
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta: 
        model = User
        fields = ['id', 'email', 'username', 'password', 'password_confirm', 'bio', 'avatar_url']

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        if password != password_confirm:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs

    def create(self, validated_data) -> User:
        validated_data.pop('password_confirm')
        return User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            bio=validated_data.get('bio', ''),
            avatar_url=validated_data.get('avatar_url', None)
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    # custom serializer to include user data in the JWT response
    def validate(self, attrs):
        data = cast(dict[str, Any], super().validate(attrs))
        data['user'] = UserSerializer(self.user).data
        return data  