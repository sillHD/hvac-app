import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';
import { useI18n } from '../../i18n/I18nProvider';

type Role = 'technician' | 'admin' | 'root';
type AssignableRole = 'technician' | 'admin';

interface ManagedUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  disabled: boolean;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'technician' as AssignableRole,
  });
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AssignableRole>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

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
        setError(data.error || t('admin.loadError'));
        return;
      }
      const fetchedUsers = (data.users || []) as ManagedUser[];
      setUsers(fetchedUsers);
      const nextDrafts: Record<string, AssignableRole> = {};
      const nextNameDrafts: Record<string, string> = {};
      fetchedUsers.forEach((u) => {
        if (u.role !== 'root') {
          nextDrafts[u.id] = toAssignableRole(u.role);
        }
        nextNameDrafts[u.id] = u.name || '';
      });
      setRoleDrafts(nextDrafts);
      setNameDrafts(nextNameDrafts);
    } catch (err) {
      console.error(err);
      setError(t('admin.loadNetworkError'));
    } finally {
      setFetching(false);
    }
  }, [t]);

  useEffect(() => {
    if (!loading && (user?.role === 'root' || user?.role === 'admin')) {
      loadUsers();
    }
  }, [loading, user?.role, loadUsers]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (createForm.role === 'technician' && !createForm.name.trim()) {
      setError('Technician name is required');
      return;
    }
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
        setError(data.error || t('admin.createError'));
        return;
      }
      setCreateForm({ name: '', email: '', password: '', role: 'technician' });
      setUsers((prev) => [...prev, data.user]);
    } catch (err) {
      console.error(err);
      setError(t('admin.createNetworkError'));
    } finally {
      setSaving(false);
    }
  };

  const patchUser = async (id: string, patch: Partial<{ role: AssignableRole; disabled: boolean; password: string; name: string }>) => {
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
        setError(data.error || t('admin.updateError'));
        return;
      }
      const updated = data.user as ManagedUser;
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setNameDrafts((prev) => ({ ...prev, [id]: updated.name || '' }));
      if (updated.role !== 'root') {
        setRoleDrafts((prev) => ({
          ...prev,
          [id]: toAssignableRole(updated.role),
        }));
      }
    } catch (err) {
      console.error(err);
      setError(t('admin.updateNetworkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.deleteConfirm'))) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('admin.deleteError'));
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      setError(t('admin.deleteNetworkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (id: string) => {
    const newPassword = prompt(t('admin.newPasswordPrompt'));
    if (!newPassword) return;
    await patchUser(id, { password: newPassword });
  };

  const handleSaveName = async (id: string) => {
    const name = (nameDrafts[id] || '').trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    await patchUser(id, { name });
  };

  if (loading) {
    return <p className="text-zinc-300 p-4">{t('ui.loading')}</p>;
  }

  if (!user || (user.role !== 'root' && user.role !== 'admin')) {
    return (
      <Protected>
        <div className="premium-card p-4 text-zinc-300">{t('admin.onlyRoot')}</div>
      </Protected>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <Protected>
      <div className="max-w-5xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-2">
          <span className="page-eyebrow">{t('admin.eyebrow')}</span>
          <h1 className="text-2xl font-bold premium-gradient-text">{t('admin.title')}</h1>
          <p className="page-subtitle">{t('admin.subtitle')}</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <form onSubmit={handleCreate} className="premium-card p-4 grid gap-3 sm:grid-cols-5">
          <input
            type="text"
            placeholder="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
          />
          <input
            type="email"
            placeholder={t('admin.emailPlaceholder')}
            value={createForm.email}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          <input
            type="text"
            placeholder={t('admin.passwordPlaceholder')}
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
            {!isAdmin && <option value="admin">admin</option>}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-4 rounded-full bg-amber-500/20 text-amber-300 px-4 py-2 hover:bg-amber-500/35 transition-colors disabled:opacity-50"
          >
            {t('admin.createUser')}
          </button>
        </form>

        <div className="space-y-3">
          {fetching ? (
            <p className="text-zinc-300">{t('admin.loadingUsers')}</p>
          ) : users.length === 0 ? (
            <p className="text-zinc-300">{t('admin.noUsers')}</p>
          ) : (
            users.map((managedUser) => (
              <div key={managedUser.id} className="premium-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-zinc-100 font-semibold">{managedUser.name || managedUser.email}</p>
                  <p className="text-xs text-zinc-400">{managedUser.email}</p>
                  <p className="text-sm text-zinc-300">
                    {t('admin.role')}: {managedUser.role} · {t('admin.state')}: {managedUser.disabled ? t('admin.blocked') : t('admin.active')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={nameDrafts[managedUser.id] || ''}
                    onChange={(e) =>
                      setNameDrafts((prev) => ({
                        ...prev,
                        [managedUser.id]: e.target.value,
                      }))
                    }
                    disabled={saving || managedUser.role === 'root' || (isAdmin && managedUser.role !== 'technician')}
                    className="px-3 py-1 text-xs rounded-full bg-black/20 border border-white/10 text-zinc-100"
                    placeholder="Name"
                  />
                  <button
                    type="button"
                    disabled={saving || managedUser.role === 'root' || (isAdmin && managedUser.role !== 'technician')}
                    onClick={() => handleSaveName(managedUser.id)}
                    className="px-3 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/35 disabled:opacity-40"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    disabled={saving || managedUser.role === 'root' || (isAdmin && managedUser.role !== 'technician')}
                    onClick={() => patchUser(managedUser.id, { disabled: !managedUser.disabled })}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-500/20 text-zinc-200 hover:bg-zinc-500/35 disabled:opacity-40"
                  >
                    {managedUser.disabled ? t('admin.unblock') : t('admin.block')}
                  </button>
                  <button
                    type="button"
                    disabled={saving || (isAdmin && managedUser.role !== 'technician')}
                    onClick={() => handleChangePassword(managedUser.id)}
                    className="px-3 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/35 disabled:opacity-40"
                  >
                    {t('admin.changePassword')}
                  </button>
                  {managedUser.role === 'root' || (isAdmin && managedUser.role === 'admin') ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-zinc-700/30 text-zinc-300">
                      {t('admin.fixedRoleRoot')}
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
                        {!isAdmin && <option value="admin">admin</option>}
                      </select>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => patchUser(managedUser.id, { role: roleDrafts[managedUser.id] || 'technician' })}
                        className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/35 disabled:opacity-40"
                      >
                        {t('admin.saveRole')}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={saving || managedUser.role === 'root' || (isAdmin && managedUser.role !== 'technician')}
                    onClick={() => handleDelete(managedUser.id)}
                    className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/35 disabled:opacity-40"
                  >
                    {t('admin.delete')}
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
