import { apiRequest } from './client';
import { User } from './types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await apiRequest<{ authenticated: boolean; user: User | null }>('/api/auth/me/');
    if (res.authenticated && res.user) {
      return res.user;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function loginUser(username: string, password: string): Promise<User> {
  const res = await apiRequest<{ success: boolean; user: User }>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
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
  const res = await apiRequest<{ success: boolean; user: User }>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.user;
}

export async function logoutUser(): Promise<void> {
  await apiRequest('/api/auth/logout/', {
    method: 'POST',
  });
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
