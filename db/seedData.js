import {
  COMMANDS, DIVISIONS, BRIGADES, BATTALIONS,
} from '../src/data/hierarchy.js';
import { INVENTORY_ITEMS, STANDARD_TIERS, DEFAULT_STANDARDS } from '../src/data/items.js';
import { DEFAULT_USERS, DEFAULT_FACILITIES } from '../src/data/seed.js';

export function buildSeedStatements() {
  const stmts = [];

  for (let i = 0; i < COMMANDS.length; i++) {
    stmts.push({
      sql: `INSERT INTO commands (name, display_order) VALUES ($1, $2)
            ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order`,
      params: [COMMANDS[i], i],
    });
  }

  let dOrder = 0;
  for (const [cmd, divs] of Object.entries(DIVISIONS)) {
    for (const d of divs) {
      stmts.push({
        sql: `INSERT INTO divisions (command_id, name, display_order)
              SELECT c.id, $2, $3 FROM commands c WHERE c.name = $1
              ON CONFLICT (command_id, name) DO UPDATE SET display_order = EXCLUDED.display_order`,
        params: [cmd, d, dOrder++],
      });
    }
  }

  let bOrder = 0;
  for (const [div, brigs] of Object.entries(BRIGADES)) {
    for (const b of brigs) {
      stmts.push({
        sql: `INSERT INTO brigades (division_id, name, display_order)
              SELECT id, $2, $3 FROM divisions WHERE name = $1 LIMIT 1
              ON CONFLICT (division_id, name) DO UPDATE SET display_order = EXCLUDED.display_order`,
        params: [div, b, bOrder++],
      });
    }
  }

  let baOrder = 0;
  for (const [brig, batts] of Object.entries(BATTALIONS)) {
    for (const ba of batts) {
      stmts.push({
        sql: `INSERT INTO battalions (brigade_id, name, display_order)
              SELECT id, $2, $3 FROM brigades WHERE name = $1 LIMIT 1
              ON CONFLICT (brigade_id, name) DO UPDATE SET display_order = EXCLUDED.display_order`,
        params: [brig, ba, baOrder++],
      });
    }
  }

  STANDARD_TIERS.forEach((t, idx) => {
    stmts.push({
      sql: `INSERT INTO standard_tiers (id, label, min_capacity, max_capacity, display_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              label = EXCLUDED.label,
              min_capacity = EXCLUDED.min_capacity,
              max_capacity = EXCLUDED.max_capacity,
              display_order = EXCLUDED.display_order`,
      params: [t.id, t.label, t.min, t.max, idx],
    });
  });

  INVENTORY_ITEMS.forEach((it, idx) => {
    stmts.push({
      sql: `INSERT INTO inventory_items (id, name, category, unit, display_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              category = EXCLUDED.category,
              unit = EXCLUDED.unit,
              display_order = EXCLUDED.display_order`,
      params: [it.id, it.name, it.category, it.unit, idx],
    });
  });

  for (const [tier, items] of Object.entries(DEFAULT_STANDARDS)) {
    for (const [itemId, qty] of Object.entries(items)) {
      stmts.push({
        sql: `INSERT INTO standards (tier_id, item_id, required_qty)
              VALUES ($1, $2, $3)
              ON CONFLICT (tier_id, item_id) DO UPDATE SET
                required_qty = EXCLUDED.required_qty,
                updated_at = NOW()`,
        params: [tier, itemId, qty],
      });
    }
  }

  for (const u of DEFAULT_USERS) {
    stmts.push({
      sql: `INSERT INTO users (id, name, personal_id, role, scope_command, scope_division, scope_brigade, scope_battalion, email, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
              updated_at = NOW()`,
      params: [
        u.id, u.name, u.personalId, u.role,
        u.scope?.command || null, u.scope?.division || null,
        u.scope?.brigade || null, u.scope?.battalion || null,
        u.email || null, u.active !== false,
      ],
    });
  }

  for (const f of DEFAULT_FACILITIES) {
    stmts.push({
      sql: `INSERT INTO facilities (id, name, command, division, brigade, battalion, camp_type, status, project, max_capacity, meal_capacity, notes, fields, active, updated_by, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              command = EXCLUDED.command,
              division = EXCLUDED.division,
              brigade = EXCLUDED.brigade,
              battalion = EXCLUDED.battalion,
              camp_type = EXCLUDED.camp_type,
              status = EXCLUDED.status,
              project = EXCLUDED.project,
              max_capacity = EXCLUDED.max_capacity,
              meal_capacity = EXCLUDED.meal_capacity,
              notes = EXCLUDED.notes,
              fields = EXCLUDED.fields,
              active = EXCLUDED.active,
              updated_by = EXCLUDED.updated_by,
              updated_at = EXCLUDED.updated_at`,
      params: [
        f.id, f.name, f.command, f.division, f.brigade, f.battalion,
        f.campType, f.status, f.project, f.maxCapacity, f.mealCapacity, f.notes,
        JSON.stringify(f.fields || {}), f.active !== false,
        f.updatedBy, f.updatedAt,
      ],
    });

    for (const [itemId, qty] of Object.entries(f.inventory || {})) {
      stmts.push({
        sql: `INSERT INTO facility_inventory (facility_id, item_id, quantity, updated_by)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (facility_id, item_id) DO UPDATE SET
                quantity = EXCLUDED.quantity,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by`,
        params: [f.id, itemId, Number(qty) || 0, f.updatedBy],
      });
    }
  }

  return stmts;
}
