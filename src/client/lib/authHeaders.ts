export function getAuthHeaders(extraHeaders?: Record<string, string>) {
  if (typeof window === 'undefined') {
    return extraHeaders || {};
  }

  const token = window.localStorage.getItem('token');
  if (!token) {
    return extraHeaders || {};
  }

  return {
    Authorization: `Bearer ${token}`,
    ...(extraHeaders || {}),
  };
}
