-- =====================================================================
-- AMIR 2.0  |  Schema definition for Postgres (Neon)
-- ארגון מרחב ייעודי רבנותי - מבנה בסיס הנתונים
-- =====================================================================

DROP TABLE IF EXISTS audit_log         CASCADE;
DROP TABLE IF EXISTS facility_inventory CASCADE;
DROP TABLE IF EXISTS facilities         CASCADE;
DROP TABLE IF EXISTS standards          CASCADE;
DROP TABLE IF EXISTS standard_tiers     CASCADE;
DROP TABLE IF EXISTS inventory_items    CASCADE;
DROP TABLE IF EXISTS battalions         CASCADE;
DROP TABLE IF EXISTS brigades           CASCADE;
DROP TABLE IF EXISTS divisions          CASCADE;
DROP TABLE IF EXISTS commands           CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

CREATE TABLE commands (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    display_order INT  DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE divisions (
    id            SERIAL PRIMARY KEY,
    command_id    INT  NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    display_order INT  DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (command_id, name)
);

CREATE TABLE brigades (
    id            SERIAL PRIMARY KEY,
    division_id   INT  NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    display_order INT  DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (division_id, name)
);

CREATE TABLE battalions (
    id            SERIAL PRIMARY KEY,
    brigade_id    INT  NOT NULL REFERENCES brigades(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    display_order INT  DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (brigade_id, name)
);

CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    personal_id     TEXT UNIQUE,
    role            TEXT NOT NULL CHECK (role IN ('admin', 'unit_manager', 'field_rabbi', 'hq_viewer')),
    scope_command   TEXT,
    scope_division  TEXT,
    scope_brigade   TEXT,
    scope_battalion TEXT,
    email           TEXT,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_items (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    unit          TEXT,
    display_order INT  DEFAULT 0,
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE standard_tiers (
    id            TEXT PRIMARY KEY,
    label         TEXT NOT NULL,
    min_capacity  INT  NOT NULL,
    max_capacity  INT  NOT NULL,
    display_order INT  DEFAULT 0
);

CREATE TABLE standards (
    id           SERIAL PRIMARY KEY,
    tier_id      TEXT NOT NULL REFERENCES standard_tiers(id) ON DELETE CASCADE,
    item_id      TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    required_qty INT  NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tier_id, item_id)
);

CREATE TABLE facilities (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    command       TEXT NOT NULL,
    division      TEXT,
    brigade       TEXT,
    battalion     TEXT,
    camp_type     TEXT,
    status        TEXT,
    project       TEXT,
    max_capacity  INT  DEFAULT 0 CHECK (max_capacity >= 0),
    meal_capacity INT  DEFAULT 0 CHECK (meal_capacity >= 0),
    notes         TEXT,
    fields        JSONB DEFAULT '{}'::jsonb,
    active        BOOLEAN DEFAULT TRUE,
    updated_by    TEXT,
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE facility_inventory (
    facility_id  TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    item_id      TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity     INT  NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    notes        TEXT,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_by   TEXT,
    PRIMARY KEY (facility_id, item_id)
);

CREATE TABLE audit_log (
    id        TEXT PRIMARY KEY,
    ts        TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT,
    action    TEXT NOT NULL,
    entity    TEXT NOT NULL,
    entity_id TEXT,
    summary   TEXT,
    details   JSONB
);

CREATE INDEX idx_divisions_command          ON divisions (command_id);
CREATE INDEX idx_brigades_division          ON brigades (division_id);
CREATE INDEX idx_battalions_brigade         ON battalions (brigade_id);

CREATE INDEX idx_facilities_command         ON facilities (command);
CREATE INDEX idx_facilities_division        ON facilities (division);
CREATE INDEX idx_facilities_brigade         ON facilities (brigade);
CREATE INDEX idx_facilities_battalion       ON facilities (battalion);
CREATE INDEX idx_facilities_status          ON facilities (status);
CREATE INDEX idx_facilities_active          ON facilities (active);

CREATE INDEX idx_facility_inventory_facility ON facility_inventory (facility_id);
CREATE INDEX idx_facility_inventory_item     ON facility_inventory (item_id);

CREATE INDEX idx_inventory_items_category    ON inventory_items (category);

CREATE INDEX idx_standards_tier_item         ON standards (tier_id, item_id);

CREATE INDEX idx_audit_log_ts                ON audit_log (ts DESC);
CREATE INDEX idx_audit_log_entity            ON audit_log (entity, entity_id);
CREATE INDEX idx_audit_log_user              ON audit_log (user_name);

CREATE OR REPLACE VIEW v_facility_compliance AS
SELECT
    f.id                        AS facility_id,
    f.name                      AS facility_name,
    f.command,
    f.division,
    f.brigade,
    f.battalion,
    f.status,
    f.max_capacity,
    t.id                        AS tier_id,
    t.label                     AS tier_label,
    COUNT(*) FILTER (WHERE s.required_qty > 0)                                            AS relevant_items,
    COUNT(*) FILTER (WHERE s.required_qty > 0 AND COALESCE(fi.quantity, 0) >= s.required_qty) AS ok_items,
    COUNT(*) FILTER (WHERE s.required_qty > 0 AND COALESCE(fi.quantity, 0) <  s.required_qty) AS missing_items,
    COALESCE(SUM(GREATEST(s.required_qty - COALESCE(fi.quantity, 0), 0)), 0) AS total_gap,
    COALESCE(SUM(GREATEST(COALESCE(fi.quantity, 0) - s.required_qty, 0)), 0) AS total_surplus
FROM facilities f
JOIN standard_tiers t
  ON f.max_capacity BETWEEN t.min_capacity AND t.max_capacity
JOIN standards s
  ON s.tier_id = t.id
LEFT JOIN facility_inventory fi
  ON fi.facility_id = f.id AND fi.item_id = s.item_id
GROUP BY f.id, t.id;
