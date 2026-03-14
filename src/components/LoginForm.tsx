import { FormEvent, useState } from 'react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecoveryMessage(null);
    setRecoveryError(null);
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

  const handleRecoverPassword = async () => {
    setRecoveryMessage(null);
    setRecoveryError(null);

    if (!email) {
      setRecoveryError('Escribe tu correo antes de recuperar la contraseña.');
      return;
    }

    setRecovering(true);
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRecoveryError(data.error || 'No se pudo iniciar la recuperacion.');
        return;
      }

      setRecoveryMessage(
        data.message || 'Si el correo existe en el sistema, recibira instrucciones de recuperacion.'
      );
    } catch (err) {
      console.error('Recovery failed', err);
      setRecoveryError('No se pudo conectar al servidor para recuperar la contraseña.');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xs mx-auto premium-card p-6">
      {error && (
        <div className="mb-4 text-amber-300 text-sm" role="alert">
          {error}
        </div>
      )}
      {recoveryMessage && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">
          {recoveryMessage}
        </div>
      )}
      {recoveryError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300" role="alert">
          {recoveryError}
        </div>
      )}
      <div className="mb-4">
        <label className="block text-zinc-100 text-sm font-bold mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="shadow appearance-none w-full py-2 px-3 leading-tight focus:outline-none"
        />
      </div>
      <div className="mb-6">
        <label className="block text-zinc-100 text-sm font-bold mb-2" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="shadow appearance-none w-full py-2 px-3 leading-tight focus:outline-none"
        />
        <button
          type="button"
          onClick={handleRecoverPassword}
          disabled={recovering}
          className="mt-3 text-sm text-amber-300 hover:text-amber-200"
        >
          {recovering ? 'Recuperando...' : 'Recuperar contraseña'}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary py-2 px-4 focus:outline-none"
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </div>
    </form>
  );
}
