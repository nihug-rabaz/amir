import { Repository } from '../core/Repository.js';
import { DEFAULT_USERS, ROLES } from '../data/seed.js';
import { uid } from '../core/utils.js';

export class UserService {
  constructor() {
    this.repo = new Repository('users');
    if (this.repo.all().length === 0) {
      this.repo.saveAll(DEFAULT_USERS);
    }
  }

  all() { return this.repo.all(); }

  active() { return this.all().filter(u => u.active); }

  find(id) { return this.repo.find(id); }

  upsert(user) {
    if (!user.id) user.id = uid('u');
    return this.repo.upsert(user);
  }

  remove(id) { this.repo.remove(id); }

  byRole(role) { return this.all().filter(u => u.role === role); }
}

export const userService = new UserService();
export { ROLES };
