# backend/common/permissions.py

from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Custom permission to ensure a user can only access/modify 
    objects where `obj.user` matches `request.user`.
    """
    def has_object_permission(self, request, view, obj):
        # Check if object has a user attribute and it matches the request user
        return hasattr(obj, 'user') and obj.user == request.user