import { Repository } from '../core/Repository.js';
import { DEFAULT_STANDARDS, STANDARD_TIERS, INVENTORY_ITEMS } from '../data/items.js';

export class StandardsService {
  constructor() {
    this.repo = new Repository('standards');
    if (!this.repo.exists()) {
      this.repo.saveAll([{ id: 'standards', data: structuredClone(DEFAULT_STANDARDS) }]);
    }
  }

  getStandards() {
    const stored = this.repo.find('standards');
    return stored?.data || DEFAULT_STANDARDS;
  }

  saveStandards(data) {
    this.repo.upsert({ id: 'standards', data });
    return data;
  }

  tiers() { return STANDARD_TIERS; }
  items() { return INVENTORY_ITEMS; }

  tierFor(capacity) {
    if (capacity == null) return STANDARD_TIERS[0];
    return STANDARD_TIERS.find(t => capacity >= t.min && capacity <= t.max) || STANDARD_TIERS[STANDARD_TIERS.length - 1];
  }

  requiredFor(itemId, capacity) {
    const tier = this.tierFor(capacity);
    const std = this.getStandards();
    return std[tier.id]?.[itemId] ?? 0;
  }

  compareFacility(facility) {
    const tier = this.tierFor(facility.maxCapacity);
    const std = this.getStandards();
    const tierStd = std[tier.id] || {};
    const inv = facility.inventory || {};
    const rows = INVENTORY_ITEMS.map((item) => {
      const required = tierStd[item.id] ?? 0;
      const actual = Number(inv[item.id] ?? 0);
      const gap = required - actual;
      let status;
      if (required === 0) status = 'not-relevant';
      else if (gap > 0) status = 'missing';
      else if (gap < 0) status = 'surplus';
      else status = 'ok';
      return {
        itemId: item.id, name: item.name, category: item.category,
        required, actual, gap, status,
      };
    });
    const relevant = rows.filter(r => r.status !== 'not-relevant');
    const ok = relevant.filter(r => r.status === 'ok' || r.status === 'surplus').length;
    const compliancePct = relevant.length === 0 ? 100 : Math.round((ok / relevant.length) * 100);
    const totalGap = rows.filter(r => r.gap > 0).reduce((s, r) => s + r.gap, 0);
    const totalSurplus = rows.filter(r => r.gap < 0).reduce((s, r) => s + Math.abs(r.gap), 0);
    const missingItems = rows.filter(r => r.status === 'missing').length;
    return { tier, rows, compliancePct, totalGap, totalSurplus, missingItems };
  }
}

export const standardsService = new StandardsService();
