/**
 * useAuth.ts — Hook de autenticación del cliente.
 *
 * Al montar, lee el token de localStorage y lo verifica contra /api/auth/session.
 * Devuelve el usuario autenticado (o null) y un flag `loading`.
 *
 * Flujo:
 *  1. Lee el token de localStorage
 *  2. Llama a GET /api/auth/session con el token en el header Authorization
 *  3. Si la respuesta incluye un usuario válido, lo setea en estado
 *  4. Si no hay token, si expiró o si el servidor responde con user: null → user queda null
 *
 * Uso:
 *   const { user, loading } = useAuth();
 *
 * NOTA: No recarga automáticamente si el token expira mientras la app está abierta.
 * Para eso, implementar un polling de sesión o interceptar errores 401 en fetch.
 */
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
