import { Repository } from '../core/Repository.js';
import { uid } from '../core/utils.js';

export class AuditService {
  constructor() { this.repo = new Repository('audit'); }

  log(entry) {
    const record = {
      id: uid('au'),
      timestamp: new Date().toISOString(),
      user: entry.user || 'מערכת',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId || null,
      summary: entry.summary || '',
      details: entry.details || null,
    };
    this.repo.upsert(record);
    return record;
  }

  all() {
    return this.repo.all().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  forEntity(entity, entityId) {
    return this.all().filter(e => e.entity === entity && e.entityId === entityId);
  }

  recent(limit = 20) {
    return this.all().slice(0, limit);
  }
}

export const auditService = new AuditService();
