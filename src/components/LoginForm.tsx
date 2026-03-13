import { FormEvent, useState } from 'react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error en el inicio de sesión');
      } else {
        const data = await res.json();
        if (data.token) {
          // store token temporarily; real apps should use HttpOnly cookie
          localStorage.setItem('token', data.token);
        }
        onSuccess?.();
      }
    } catch (err) {
      console.error('Login failed', err);
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xs mx-auto bg-white p-6 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="mb-4">
        <label className="block text-slate-900 text-sm font-bold mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-6">
        <label className="block text-slate-900 text-sm font-bold mb-2" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="shadow appearance-none border border-slate-300 rounded w-full py-2 px-3 text-slate-900 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-500 transition"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </div>
    </form>
  );
}
