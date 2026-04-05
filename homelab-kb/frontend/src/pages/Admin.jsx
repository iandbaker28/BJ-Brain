import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const ROLES = ["reader", "editor", "admin"];
const ROLE_COLORS = { reader: "text-blue-400", editor: "text-yellow-400", admin: "text-red-400" };

export default function Admin() {
  const { authFetch, user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "reader" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/users");
      if (r.ok) setUsers(await r.json());
    } catch {/* ignore */}
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setCreating(true);
    try {
      const r = await authFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.detail || "Failed to create user");
      }
      setFormSuccess(`User "${form.username}" created successfully`);
      setForm({ username: "", email: "", password: "", role: "reader" });
      await loadUsers();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (userId, role) => {
    try {
      const r = await authFetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (r.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      }
    } catch {/* ignore */}
  };

  const toggleActive = async (userId, is_active) => {
    try {
      const r = await authFetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (r.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active } : u));
      }
    } catch {/* ignore */}
  };

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const r = await authFetch(`/api/users/${userId}`, { method: "DELETE" });
      if (r.ok) setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {/* ignore */}
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-text-primary mb-6">User Management</h1>

      {/* Create user form */}
      <div className="card mb-8">
        <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">Create User</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Username</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              minLength={2}
              maxLength={64}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {formError && (
            <div className="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="sm:col-span-2 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded px-3 py-2">
              {formSuccess}
            </div>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>

      {/* User table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
          Users ({users.length})
        </h2>
        {loading ? (
          <p className="text-text-muted text-sm animate-pulse">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Username</th>
                  <th className="text-left py-2 pr-4">Email</th>
                  <th className="text-left py-2 pr-4">Role</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2 pr-4 font-mono text-xs">
                      {u.username}
                      {u.id === me?.id && <span className="ml-1 text-text-muted">(you)</span>}
                    </td>
                    <td className="py-2 pr-4 text-text-secondary text-xs">{u.email}</td>
                    <td className="py-2 pr-4">
                      {u.id === me?.id ? (
                        <span className={`${ROLE_COLORS[u.role]} font-medium`}>{u.role}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="bg-surface-3 border border-border rounded px-2 py-0.5 text-xs text-text-primary"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs ${u.is_active ? "text-green-400" : "text-red-400"}`}>
                        {u.is_active ? "active" : "disabled"}
                      </span>
                    </td>
                    <td className="py-2">
                      {u.id !== me?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleActive(u.id, !u.is_active)}
                            className="text-xs text-text-muted hover:text-text-primary transition-colors"
                          >
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.username)}
                            className="text-xs text-red-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
