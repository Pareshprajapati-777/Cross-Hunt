from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages
from django.core.exceptions import PermissionDenied


def role_required(allowed_roles):
    """
    Decorator for views that checks whether the user has one of the allowed roles.
    If not authenticated, redirects to login.
    If authenticated but wrong role, redirects to their own dashboard with warning.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                messages.warning(request, "Please log in to access this page.")
                return redirect('login')

            user = request.user
            # Superusers always have admin access
            if user.is_superuser or user.is_staff:
                if 'ADMIN' in allowed_roles:
                    return view_func(request, *args, **kwargs)

            if user.role in allowed_roles:
                return view_func(request, *args, **kwargs)

            # Redirect to user's appropriate dashboard
            messages.error(request, f"Access denied: You do not have permissions to view this section.")
            return redirect('dashboard_redirect')
        return _wrapped_view
    return decorator


def customer_required(view_func):
    return role_required(['USER'])(view_func)


def owner_required(view_func):
    return role_required(['CROSS_OWNER'])(view_func)


def admin_required(view_func):
    return role_required(['ADMIN'])(view_func)
