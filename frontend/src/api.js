export const API_BASE = 'http://localhost:4000';

export function getToken() {
  return localStorage.getItem('ab_token') || '';
}

export function setAuth(token, user) {
  localStorage.setItem('ab_token', token);
  localStorage.setItem('ab_user', JSON.stringify(user || {}));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ab_user') || '{}');
  } catch {
    return {};
  }
}

export function logout() {
  localStorage.removeItem('ab_token');
  localStorage.removeItem('ab_user');
  window.location.reload();
}
