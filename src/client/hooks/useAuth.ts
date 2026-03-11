import { useState, useEffect } from 'react';

export function useAuth() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null); // using any to keep flexible, caller can cast to proper shape
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/session', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('session fetch failed', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { user, loading };
}
