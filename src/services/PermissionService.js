import { ROLES } from '../data/seed.js';

export class PermissionService {
  static can(user, action, ctx = {}) {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true;
    switch (action) {
      case 'view:all':
        return true;
      case 'view:facility':
        return PermissionService.inScope(user, ctx.facility);
      case 'edit:facility':
        return [ROLES.UNIT_MANAGER, ROLES.FIELD_RABBI].includes(user.role) && PermissionService.inScope(user, ctx.facility);
      case 'create:facility':
        return user.role === ROLES.UNIT_MANAGER;
      case 'delete:facility':
        return false;
      case 'edit:inventory':
        return [ROLES.UNIT_MANAGER, ROLES.FIELD_RABBI].includes(user.role) && PermissionService.inScope(user, ctx.facility);
      case 'manage:users':
        return false;
      case 'manage:standards':
        return false;
      case 'export':
        return true;
      default:
        return false;
    }
  }

  static inScope(user, facility) {
    if (!user || !facility) return false;
    if (user.role === ROLES.ADMIN || user.role === ROLES.HQ_VIEWER) return true;
    const s = user.scope || {};
    if (s.command && s.command !== facility.command) return false;
    if (s.division && s.division !== facility.division) return false;
    if (s.brigade && s.brigade !== facility.brigade) return false;
    if (s.battalion && s.battalion !== facility.battalion) return false;
    return true;
  }

  static filterFacilities(user, facilities) {
    if (!user) return [];
    if (user.role === ROLES.ADMIN || user.role === ROLES.HQ_VIEWER) return facilities;
    return facilities.filter(f => PermissionService.inScope(user, f));
  }
}
