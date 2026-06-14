import { sql } from './db';
import type {
  Facility, FacilityFields, User, InventoryItem, StandardTier,
  Compliance, ComplianceRow, FacilityWithCompliance, AuditEntry, GapStatus,
} from './types';
import { uid } from './format';

type Row = Record<string, unknown>;

function asString(v: unknown): string {
  return v == null ? '' : String(v);
}
function asNumber(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 't' || v === 1 || v === '1') return true;
  return false;
}

function mapFacility(r: Row): Facility {
  return {
    id: asString(r.id),
    name: asString(r.name),
    command: asString(r.command),
    division: r.division ? asString(r.division) : null,
    brigade: r.brigade ? asString(r.brigade) : null,
    battalion: r.battalion ? asString(r.battalion) : null,
    campType: r.camp_type ? asString(r.camp_type) : null,
    status: r.status ? asString(r.status) : null,
    project: r.project ? asString(r.project) : null,
    maxCapacity: asNumber(r.max_capacity),
    mealCapacity: asNumber(r.meal_capacity),
    notes: r.notes ? asString(r.notes) : null,
    fields: (r.fields || {}) as FacilityFields,
    active: asBool(r.active),
    updatedBy: r.updated_by ? asString(r.updated_by) : null,
    updatedAt: asString(r.updated_at),
  };
}

function mapUser(r: Row): User {
  return {
    id: asString(r.id),
    name: asString(r.name),
    personalId: asString(r.personal_id),
    role: asString(r.role) as User['role'],
    scope: {
      command: r.scope_command ? asString(r.scope_command) : null,
      division: r.scope_division ? asString(r.scope_division) : null,
      brigade: r.scope_brigade ? asString(r.scope_brigade) : null,
      battalion: r.scope_battalion ? asString(r.scope_battalion) : null,
    },
    active: asBool(r.active),
    email: r.email ? asString(r.email) : null,
  };
}

export class UserRepo {
  static async all(): Promise<User[]> {
    const rows = (await sql()`SELECT * FROM users ORDER BY name`) as Row[];
    return rows.map(mapUser);
  }
  static async active(): Promise<User[]> {
    const rows = (await sql()`SELECT * FROM users WHERE active = TRUE ORDER BY name`) as Row[];
    return rows.map(mapUser);
  }
  static async find(id: string): Promise<User | null> {
    const rows = (await sql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`) as Row[];
    return rows[0] ? mapUser(rows[0]) : null;
  }
  static async upsert(u: User): Promise<User> {
    const id = u.id || uid('u');
    await sql()`
      INSERT INTO users (id, name, personal_id, role, scope_command, scope_division, scope_brigade, scope_battalion, email, active, updated_at)
      VALUES (${id}, ${u.name}, ${u.personalId}, ${u.role},
              ${u.scope.command}, ${u.scope.division}, ${u.scope.brigade}, ${u.scope.battalion},
              ${u.email || null}, ${u.active}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        personal_id = EXCLUDED.personal_id,
        role = EXCLUDED.role,
        scope_command = EXCLUDED.scope_command,
        scope_division = EXCLUDED.scope_division,
        scope_brigade = EXCLUDED.scope_brigade,
        scope_battalion = EXCLUDED.scope_battalion,
        email = EXCLUDED.email,
        active = EXCLUDED.active,
        updated_at = NOW()
    `;
    return { ...u, id };
  }
  static async delete(id: string): Promise<void> {
    await sql()`DELETE FROM users WHERE id = ${id}`;
  }
}

export class ItemRepo {
  static async all(): Promise<InventoryItem[]> {
    const rows = (await sql()`SELECT id, name, category, unit FROM inventory_items WHERE active = TRUE ORDER BY display_order, name`) as Row[];
    return rows.map((r) => ({
      id: asString(r.id), name: asString(r.name), category: asString(r.category), unit: asString(r.unit),
    }));
  }
}

export class TierRepo {
  static async all(): Promise<StandardTier[]> {
    const rows = (await sql()`SELECT id, label, min_capacity, max_capacity FROM standard_tiers ORDER BY display_order`) as Row[];
    return rows.map((r) => ({
      id: asString(r.id), label: asString(r.label),
      min: asNumber(r.min_capacity), max: asNumber(r.max_capacity),
    }));
  }
  static async tierFor(capacity: number): Promise<StandardTier | null> {
    const tiers = await this.all();
    return tiers.find((t) => capacity >= t.min && capacity <= t.max) || tiers[tiers.length - 1] || null;
  }
}

export class StandardRepo {
  static async forTier(tierId: string): Promise<Record<string, number>> {
    const rows = (await sql()`SELECT item_id, required_qty FROM standards WHERE tier_id = ${tierId}`) as Row[];
    const map: Record<string, number> = {};
    for (const r of rows) map[asString(r.item_id)] = asNumber(r.required_qty);
    return map;
  }
  static async all(): Promise<Record<string, Record<string, number>>> {
    const rows = (await sql()`SELECT tier_id, item_id, required_qty FROM standards`) as Row[];
    const out: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const t = asString(r.tier_id);
      (out[t] ||= {})[asString(r.item_id)] = asNumber(r.required_qty);
    }
    return out;
  }
  static async save(tierId: string, itemId: string, qty: number): Promise<void> {
    await sql()`
      INSERT INTO standards (tier_id, item_id, required_qty)
      VALUES (${tierId}, ${itemId}, ${qty})
      ON CONFLICT (tier_id, item_id) DO UPDATE SET required_qty = EXCLUDED.required_qty, updated_at = NOW()
    `;
  }
}

export class FacilityRepo {
  static async all(): Promise<Facility[]> {
    const rows = (await sql()`SELECT * FROM facilities ORDER BY updated_at DESC`) as Row[];
    return rows.map(mapFacility);
  }
  static async find(id: string): Promise<Facility | null> {
    const rows = (await sql()`SELECT * FROM facilities WHERE id = ${id} LIMIT 1`) as Row[];
    return rows[0] ? mapFacility(rows[0]) : null;
  }
  static async inventoryOf(facilityId: string): Promise<Record<string, number>> {
    const rows = (await sql()`SELECT item_id, quantity FROM facility_inventory WHERE facility_id = ${facilityId}`) as Row[];
    const out: Record<string, number> = {};
    for (const r of rows) out[asString(r.item_id)] = asNumber(r.quantity);
    return out;
  }
  static async create(
    input: Omit<Facility, 'id' | 'updatedAt' | 'updatedBy'> & { updatedBy?: string | null },
    actor: User | null,
  ): Promise<Facility> {
    const id = uid('fac');
    const now = new Date().toISOString();
    await sql()`
      INSERT INTO facilities (id, name, command, division, brigade, battalion, camp_type, status, project,
                              max_capacity, meal_capacity, notes, fields, active, updated_by, updated_at)
      VALUES (${id}, ${input.name}, ${input.command}, ${input.division}, ${input.brigade}, ${input.battalion},
              ${input.campType}, ${input.status}, ${input.project},
              ${input.maxCapacity}, ${input.mealCapacity}, ${input.notes},
              ${JSON.stringify(input.fields || {})}::jsonb, ${input.active},
              ${actor?.name || null}, ${now})
    `;
    await AuditRepo.log({
      user: actor?.name || 'מערכת',
      action: 'create', entity: 'facility', entityId: id,
      summary: `נוצר מתקן חדש: ${input.name}`,
    });
    return { ...input, updatedBy: actor?.name || null, id, updatedAt: now };
  }
  static async update(id: string, patch: Partial<Facility>, actor: User | null): Promise<Facility | null> {
    const prev = await this.find(id);
    if (!prev) return null;
    const next: Facility = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
    await sql()`
      UPDATE facilities SET
        name = ${next.name},
        command = ${next.command},
        division = ${next.division},
        brigade = ${next.brigade},
        battalion = ${next.battalion},
        camp_type = ${next.campType},
        status = ${next.status},
        project = ${next.project},
        max_capacity = ${next.maxCapacity},
        meal_capacity = ${next.mealCapacity},
        notes = ${next.notes},
        fields = ${JSON.stringify(next.fields || {})}::jsonb,
        active = ${next.active},
        updated_by = ${actor?.name || prev.updatedBy},
        updated_at = ${next.updatedAt}
      WHERE id = ${id}
    `;
    await AuditRepo.log({
      user: actor?.name || 'מערכת',
      action: 'update', entity: 'facility', entityId: id,
      summary: `עודכנו פרטי מתקן: ${next.name}`,
    });
    return next;
  }
  // Persists the whole inventory in one batched upsert to avoid per-item round-trips that time out on edge.
  static async saveInventory(facilityId: string, inventory: Record<string, number>, actor: User | null): Promise<void> {
    const fac = await this.find(facilityId);
    if (!fac) return;
    const updatedBy = actor?.name || fac.updatedBy || 'מערכת';
    const itemIds: string[] = [];
    const quantities: number[] = [];
    for (const [itemId, qty] of Object.entries(inventory)) {
      if (!itemId) continue;
      itemIds.push(itemId);
      quantities.push(Math.max(0, Math.round(Number(qty) || 0)));
    }
    if (itemIds.length > 0) {
      await sql()`
        INSERT INTO facility_inventory (facility_id, item_id, quantity, updated_by, updated_at)
        SELECT ${facilityId}, t.item_id, t.qty, ${updatedBy}, NOW()
        FROM unnest(${itemIds}::text[], ${quantities}::int[]) AS t(item_id, qty)
        ON CONFLICT (facility_id, item_id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;
    }
    await sql()`UPDATE facilities SET updated_by = ${updatedBy}, updated_at = NOW() WHERE id = ${facilityId}`;
    await AuditRepo.log({
      user: updatedBy, action: 'update-inventory', entity: 'facility', entityId: facilityId,
      summary: `עודכן מלאי במתקן ${fac.name}`,
    });
  }
}

export class AuditRepo {
  static async log(entry: Omit<AuditEntry, 'id' | 'timestamp'> & { user: string }): Promise<void> {
    const id = uid('au');
    await sql()`
      INSERT INTO audit_log (id, ts, user_name, action, entity, entity_id, summary)
      VALUES (${id}, NOW(), ${entry.user}, ${entry.action}, ${entry.entity}, ${entry.entityId}, ${entry.summary})
    `;
  }
  static async all(limit = 200): Promise<AuditEntry[]> {
    const rows = (await sql()`SELECT * FROM audit_log ORDER BY ts DESC LIMIT ${limit}`) as Row[];
    return rows.map((r) => ({
      id: asString(r.id),
      timestamp: asString(r.ts),
      user: asString(r.user_name),
      action: asString(r.action),
      entity: asString(r.entity),
      entityId: r.entity_id ? asString(r.entity_id) : null,
      summary: asString(r.summary),
    }));
  }
  static async forEntity(entity: string, entityId: string): Promise<AuditEntry[]> {
    const rows = (await sql()`SELECT * FROM audit_log WHERE entity = ${entity} AND entity_id = ${entityId} ORDER BY ts DESC`) as Row[];
    return rows.map((r) => ({
      id: asString(r.id),
      timestamp: asString(r.ts),
      user: asString(r.user_name),
      action: asString(r.action),
      entity: asString(r.entity),
      entityId: r.entity_id ? asString(r.entity_id) : null,
      summary: asString(r.summary),
    }));
  }
}

export class ComplianceCalc {
  static async compute(facility: Facility): Promise<Compliance> {
    const tier = await TierRepo.tierFor(facility.maxCapacity);
    if (!tier) {
      return { tier: { id: '-', label: '—', min: 0, max: 0 }, rows: [], compliancePct: 100, totalGap: 0, totalSurplus: 0, missingItems: 0 };
    }
    const std = await StandardRepo.forTier(tier.id);
    const items = await ItemRepo.all();
    const inv = await FacilityRepo.inventoryOf(facility.id);
    const rows: ComplianceRow[] = items.map((item) => {
      const required = std[item.id] ?? 0;
      const actual = Number(inv[item.id] ?? 0);
      const gap = required - actual;
      let status: GapStatus;
      if (required === 0) status = 'not-relevant';
      else if (gap > 0) status = 'missing';
      else if (gap < 0) status = 'surplus';
      else status = 'ok';
      return { itemId: item.id, name: item.name, category: item.category, required, actual, gap, status };
    });
    const relevant = rows.filter((r) => r.status !== 'not-relevant');
    const ok = relevant.filter((r) => r.status === 'ok' || r.status === 'surplus').length;
    const compliancePct = relevant.length === 0 ? 100 : Math.round((ok / relevant.length) * 100);
    const totalGap = rows.filter((r) => r.gap > 0).reduce((s, r) => s + r.gap, 0);
    const totalSurplus = rows.filter((r) => r.gap < 0).reduce((s, r) => s + Math.abs(r.gap), 0);
    const missingItems = rows.filter((r) => r.status === 'missing').length;
    return { tier, rows, compliancePct, totalGap, totalSurplus, missingItems };
  }

  static async enrichAll(facilities: Facility[]): Promise<FacilityWithCompliance[]> {
    const tiers = await TierRepo.all();
    const items = await ItemRepo.all();
    const stdAll = await StandardRepo.all();
    const ids = facilities.map((f) => f.id);
    const invMap: Record<string, Record<string, number>> = {};
    if (ids.length > 0) {
      const rows = (await sql()`SELECT facility_id, item_id, quantity FROM facility_inventory WHERE facility_id = ANY(${ids})`) as Row[];
      for (const r of rows) {
        const fId = asString(r.facility_id);
        (invMap[fId] ||= {})[asString(r.item_id)] = asNumber(r.quantity);
      }
    }
    return facilities.map((f) => {
      const tier = tiers.find((t) => f.maxCapacity >= t.min && f.maxCapacity <= t.max) || tiers[tiers.length - 1];
      const std = (tier && stdAll[tier.id]) || {};
      const inv = invMap[f.id] || {};
      const rows: ComplianceRow[] = items.map((item) => {
        const required = std[item.id] ?? 0;
        const actual = Number(inv[item.id] ?? 0);
        const gap = required - actual;
        let status: GapStatus;
        if (required === 0) status = 'not-relevant';
        else if (gap > 0) status = 'missing';
        else if (gap < 0) status = 'surplus';
        else status = 'ok';
        return { itemId: item.id, name: item.name, category: item.category, required, actual, gap, status };
      });
      const relevant = rows.filter((r) => r.status !== 'not-relevant');
      const ok = relevant.filter((r) => r.status === 'ok' || r.status === 'surplus').length;
      const compliancePct = relevant.length === 0 ? 100 : Math.round((ok / relevant.length) * 100);
      const totalGap = rows.filter((r) => r.gap > 0).reduce((s, r) => s + r.gap, 0);
      const totalSurplus = rows.filter((r) => r.gap < 0).reduce((s, r) => s + Math.abs(r.gap), 0);
      const missingItems = rows.filter((r) => r.status === 'missing').length;
      return {
        ...f,
        compliance: {
          tier: tier || { id: '-', label: '—', min: 0, max: 0 },
          rows, compliancePct, totalGap, totalSurplus, missingItems,
        },
      };
    });
  }
}
