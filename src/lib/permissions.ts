import type { Facility, User } from './types';

export function inScope(user: User | null, facility: Facility): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'hq_viewer') return true;
  const s = user.scope;
  if (s.command && s.command !== facility.command) return false;
  if (s.division && s.division !== facility.division) return false;
  if (s.brigade && s.brigade !== facility.brigade) return false;
  if (s.battalion && s.battalion !== facility.battalion) return false;
  return true;
}

export function filterFacilities<T extends Facility>(user: User | null, facilities: T[]): T[] {
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'hq_viewer') return facilities;
  return facilities.filter((f) => inScope(user, f));
}

export function canEditFacility(user: User | null, facility: Facility): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return (user.role === 'unit_manager' || user.role === 'field_rabbi') && inScope(user, facility);
}

export function canCreateFacility(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'unit_manager';
}

export function canManageUsers(user: User | null): boolean {
  return user?.role === 'admin';
}

export function canManageStandards(user: User | null): boolean {
  return user?.role === 'admin';
}
