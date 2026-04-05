import { useAuth } from "../hooks/useAuth";

const ROLE_LEVELS = { reader: 0, editor: 1, admin: 2 };

export default function RoleGuard({ role, children, fallback = null }) {
  const { user } = useAuth();
  if (!user) return fallback;
  const userLevel = ROLE_LEVELS[user.role] ?? -1;
  const required = ROLE_LEVELS[role] ?? 999;
  if (userLevel < required) return fallback;
  return children;
}
