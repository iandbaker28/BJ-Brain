import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import RoleGuard from "./components/RoleGuard";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ArticleView from "./pages/ArticleView";
import ArticleEditor from "./pages/ArticleEditor";
import Search from "./pages/Search";
import Admin from "./pages/Admin";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center text-text-muted animate-pulse">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  const ROLE_LEVELS = { reader: 0, editor: 1, admin: 2 };
  const userLevel = ROLE_LEVELS[user?.role] ?? -1;
  const required = ROLE_LEVELS[role] ?? 999;
  if (userLevel < required) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2.5 bg-surface-1 border-b border-border sticky top-0 z-10">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-text-muted hover:text-text-primary p-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="font-semibold text-text-primary tracking-tight">
            Homelab <span className="text-accent">KB</span>
          </span>
        </Link>

        <div className="flex-1 flex items-center">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <RoleGuard role="admin">
            <Link to="/admin" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Admin
            </Link>
          </RoleGuard>
          <span className="text-xs text-text-muted hidden sm:block">
            {user?.username}
            <span className="ml-1 text-text-muted opacity-60">({user?.role})</span>
          </span>
          <button
            onClick={logout}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/articles/:id" element={<ArticleView />} />
            <Route
              path="/articles/new"
              element={
                <RequireRole role="editor">
                  <ArticleEditor />
                </RequireRole>
              }
            />
            <Route
              path="/articles/:id/edit"
              element={
                <RequireRole role="editor">
                  <ArticleEditor />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <Admin />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
