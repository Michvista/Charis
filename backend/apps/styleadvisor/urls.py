from django.urls import path

from .views import StyleCompleteView, StyleKnowledgeUploadView

urlpatterns = [
    path("knowledge/", StyleKnowledgeUploadView.as_view(), name="styleadvisor-knowledge"),
    path("complete/", StyleCompleteView.as_view(), name="styleadvisor-complete"),
]
