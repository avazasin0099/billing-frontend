import { useMemo } from 'react';
import type { Shop, User, UserRole } from '@/types';

const read = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/** Roles allowed to manage catalog, stock, purchases, returns, expenses and reports. */
export const MANAGER_ROLES: UserRole[] = ['OWNER', 'MANAGER'];

export const hasRole = (role: UserRole | undefined, allowed?: UserRole[]) =>
  !allowed || (!!role && allowed.includes(role));

/** Current signed-in user + active shop, read once from the session stored at login. */
export function useSession() {
  return useMemo(() => {
    const user = read<User>('billpro_user');
    const shop = read<Shop & { address?: string; email?: string }>('billpro_shop');
    const role = user?.role;
    return {
      user,
      shop,
      role,
      isOwner: role === 'OWNER',
      isManager: hasRole(role, MANAGER_ROLES),
    };
  }, []);
}
