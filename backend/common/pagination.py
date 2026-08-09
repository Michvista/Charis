from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    """
    Default pagination for list endpoints.
    Allows clients to pass ?page_size=X (up to 100).
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100