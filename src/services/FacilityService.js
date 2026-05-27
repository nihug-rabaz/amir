import { Repository } from '../core/Repository.js';
import { DEFAULT_FACILITIES } from '../data/seed.js';
import { uid } from '../core/utils.js';
import { standardsService } from './StandardsService.js';
import { auditService } from './AuditService.js';

export class FacilityService {
  constructor() {
    this.repo = new Repository('facilities');
    if (this.repo.all().length === 0) {
      this.repo.saveAll(DEFAULT_FACILITIES);
    }
  }

  all() { return this.repo.all(); }

  find(id) { return this.repo.find(id); }

  create(data, actor) {
    const facility = {
      id: uid('fac'),
      active: true,
      inventory: {},
      fields: {},
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'מערכת',
      ...data,
    };
    this.repo.upsert(facility);
    auditService.log({
      user: actor?.name, action: 'create', entity: 'facility',
      entityId: facility.id, summary: `נוצר מתקן חדש: ${facility.name}`,
    });
    return facility;
  }

  update(id, patch, actor) {
    const prev = this.repo.find(id);
    if (!prev) return null;
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString(), updatedBy: actor?.name || prev.updatedBy };
    this.repo.upsert(next);
    auditService.log({
      user: actor?.name, action: 'update', entity: 'facility',
      entityId: id, summary: `עודכנו פרטי מתקן: ${next.name}`,
    });
    return next;
  }

  updateInventory(id, inventory, actor) {
    const prev = this.repo.find(id);
    if (!prev) return null;
    const next = { ...prev, inventory: { ...prev.inventory, ...inventory }, updatedAt: new Date().toISOString(), updatedBy: actor?.name || prev.updatedBy };
    this.repo.upsert(next);
    auditService.log({
      user: actor?.name, action: 'update-inventory', entity: 'facility',
      entityId: id, summary: `עודכן מלאי במתקן ${next.name}`,
    });
    return next;
  }

  remove(id, actor) {
    const prev = this.repo.find(id);
    this.repo.remove(id);
    auditService.log({
      user: actor?.name, action: 'delete', entity: 'facility',
      entityId: id, summary: `נמחק מתקן: ${prev?.name || id}`,
    });
  }

  enriched(facility) {
    const cmp = standardsService.compareFacility(facility);
    return { ...facility, compliance: cmp };
  }

  enrichAll() { return this.all().map(f => this.enriched(f)); }

  summary(facilities) {
    const list = facilities.map(f => this.enriched(f));
    const total = list.length;
    const active = list.filter(f => f.status === 'תקין - בשימוש').length;
    const reno = list.filter(f => f.status === 'בשיפוץ').length;
    const inactive = list.filter(f => f.status === 'לא בשימוש').length;
    const planning = list.filter(f => f.status === 'בתכנון').length;
    const building = list.filter(f => f.status === 'בבנייה').length;
    const compliant = list.filter(f => f.compliance.compliancePct >= 90).length;
    const totalGaps = list.reduce((s, f) => s + f.compliance.totalGap, 0);
    const totalSurplus = list.reduce((s, f) => s + f.compliance.totalSurplus, 0);
    const avgCompliance = total === 0 ? 0 : Math.round(list.reduce((s, f) => s + f.compliance.compliancePct, 0) / total);
    return { total, active, reno, inactive, planning, building, compliant, totalGaps, totalSurplus, avgCompliance, list };
  }
}

export const facilityService = new FacilityService();
