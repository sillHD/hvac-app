import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';

type Role = 'technician' | 'admin' | 'root';
type AssignableRole = 'technician' | 'admin';

interface ManagedUser {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role: 'technician' as AssignableRole,
  });
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AssignableRole>>({});

  function toAssignableRole(role: Role): AssignableRole {
    return role === 'admin' ? 'admin' : 'technician';
  }

  const loadUsers = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudieron cargar los usuarios.');
        return;
      }
      const fetchedUsers = (data.users || []) as ManagedUser[];
      setUsers(fetchedUsers);
      const nextDrafts: Record<string, AssignableRole> = {};
      fetchedUsers.forEach((u) => {
        if (u.role !== 'root') {
          nextDrafts[u.id] = toAssignableRole(u.role);
        }
      });
      setRoleDrafts(nextDrafts);
    } catch (err) {
      console.error(err);
      setError('Error de red al consultar usuarios.');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user?.role === 'root') {
      loadUsers();
    }
  }, [loading, user?.role, loadUsers]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el usuario.');
        return;
      }
      setCreateForm({ email: '', password: '', role: 'technician' });
      setUsers((prev) => [...prev, data.user]);
    } catch (err) {
      console.error(err);
      setError('Error de red al crear usuario.');
    } finally {
      setSaving(false);
    }
  };

  const patchUser = async (id: string, patch: Partial<{ role: AssignableRole; disabled: boolean; password: string }>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar el usuario.');
        return;
      }
      const updated = data.user as ManagedUser;
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      if (updated.role !== 'root') {
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: toAssignableRole(updated.role),
        }));
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al actualizar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas borrar este usuario?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo borrar el usuario.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      setError('Error de red al borrar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (id: string) => {
    const newPassword = prompt('Nueva contraseña para el usuario:');
    if (!newPassword) return;
    await patchUser(id, { password: newPassword });
  };

  if (loading) {
    return <p className="text-zinc-300 p-4">Cargando...</p>;
  }

  if (!user || user.role !== 'root') {
    return (
      <Protected>
        <div className="premium-card p-4 text-zinc-300">Solo Root puede administrar usuarios.</div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="max-w-5xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-2">
          <span className="page-eyebrow">Administración Root</span>
          <h1 className="text-2xl font-bold premium-gradient-text">Gestión de usuarios</h1>
          <p className="page-subtitle">Crea usuarios, bloquea temporalmente, elimina cuentas y cambia claves.</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <form onSubmit={handleCreate} className="premium-card p-4 grid gap-3 sm:grid-cols-4">
          <input
            type="email"
            placeholder="Correo"
            value={createForm.email}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
            className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          <input
            type="text"
            placeholder="Contraseña"
            value={createForm.password}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          <select
            value={createForm.role}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, role: e.target.value as AssignableRole }))
            }
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
          >
            <option value="technician">technician</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-4 rounded-full bg-amber-500/20 text-amber-300 px-4 py-2 hover:bg-amber-500/35 transition-colors disabled:opacity-50"
          >
            Crear usuario
          </button>
        </form>

        <div className="space-y-3">
          {fetching ? (
            <p className="text-zinc-300">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="text-zinc-300">No hay usuarios disponibles.</p>
          ) : (
            users.map((managedUser) => (
              <div key={managedUser.id} className="premium-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-zinc-100 font-semibold">{managedUser.email}</p>
                  <p className="text-sm text-zinc-300">
                    Rol: {managedUser.role} · Estado: {managedUser.disabled ? 'Bloqueado' : 'Activo'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || managedUser.role === 'root'}
                    onClick={() => patchUser(managedUser.id, { disabled: !managedUser.disabled })}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-500/20 text-zinc-200 hover:bg-zinc-500/35 disabled:opacity-40"
                  >
                    {managedUser.disabled ? 'Desbloquear' : 'Bloquear'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleChangePassword(managedUser.id)}
                    className="px-3 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/35 disabled:opacity-40"
                  >
                    Cambiar clave
                  </button>
                  {managedUser.role === 'root' ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-zinc-700/30 text-zinc-300">
                      Rol fijo: root
                    </span>
                  ) : (
                    <>
                      <select
                        value={roleDrafts[managedUser.id] || toAssignableRole(managedUser.role)}
                        onChange={(e) =>
                          setRoleDrafts((prev) => ({
                            ...prev,
                            [managedUser.id]: e.target.value as AssignableRole,
                          }))
                        }
                        className="px-3 py-1 text-xs rounded-full bg-black/20 border border-white/10 text-zinc-100"
                      >
                        <option value="technician">technician</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => patchUser(managedUser.id, { role: roleDrafts[managedUser.id] || 'technician' })}
                        className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/35 disabled:opacity-40"
                      >
                        Guardar rol
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={saving || managedUser.role === 'root'}
                    onClick={() => handleDelete(managedUser.id)}
                    className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/35 disabled:opacity-40"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Protected>
  );
}
