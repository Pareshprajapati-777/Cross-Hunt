import { apiRequest, setAuthToken } from './client';
import { User } from './types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await apiRequest<{ authenticated: boolean; user: User | null }>('/api/auth/me/');
    if (res.authenticated && res.user) {
      return res.user;
    }
    setAuthToken(null);
    return null;
  } catch (err) {
    return null;
  }
}

export async function loginUser(username: string, password: string): Promise<User> {
  const res = await apiRequest<{ success: boolean; user: User; token?: string }>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res.user;
}

export async function registerUser(payload: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: string;
}): Promise<User> {
  const res = await apiRequest<{ success: boolean; user: User; token?: string }>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res.user;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout/', {
      method: 'POST',
    });
  } catch {
    // Continue even if logout endpoint fails so client side is cleared
  } finally {
    setAuthToken(null);
  }
}

export async function updateUserProfile(payload: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string;
}): Promise<{ success: boolean; user: User; message: string }> {
  return apiRequest('/api/auth/profile/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(username_or_email: string): Promise<{
  success: boolean;
  message: string;
  username: string;
  masked_email: string;
}> {
  return apiRequest('/api/auth/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ username_or_email }),
  });
}

export async function resetPassword(
  username_or_email: string,
  new_password: string
): Promise<{
  success: boolean;
  message: string;
  username: string;
}> {
  return apiRequest('/api/auth/reset-password/', {
    method: 'POST',
    body: JSON.stringify({ username_or_email, new_password }),
  });
}

