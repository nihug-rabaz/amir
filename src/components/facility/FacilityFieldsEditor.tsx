'use client';
import type { FacilityFields } from '@/lib/types';
import { FIELD_GROUPS, type FieldDef } from '@/lib/facilityFieldGroups';
import { Field, NumField, Check } from './fieldControls';

interface Props {
  group: string;
  fields: FacilityFields;
  onChange: (key: keyof FacilityFields, value: string | number | boolean) => void;
}

// Renders the editable facility-field inputs for a given category group.
export function FacilityFieldsEditor({ group, fields, onChange }: Props) {
  const defs = FIELD_GROUPS[group] || [];
  return (
    <div className="card card-padded">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {defs.map((d) => <FieldControl key={d.key} def={d} fields={fields} onChange={onChange} />)}
      </div>
    </div>
  );
}

function FieldControl({ def, fields, onChange }: { def: FieldDef; fields: FacilityFields; onChange: Props['onChange'] }) {
  const raw = fields[def.key];
  if (def.type === 'bool') return <Check label={def.label} val={!!raw} set={(v) => onChange(def.key, v)} />;
  if (def.type === 'num') return <NumField label={def.label} val={typeof raw === 'number' ? raw : 0} set={(v) => onChange(def.key, v)} />;
  if (def.type === 'textarea') {
    return (
      <div className="md:col-span-2 xl:col-span-3">
        <Field label={def.label}>
          <textarea className="input min-h-20" value={(raw as string) || ''} onChange={(e) => onChange(def.key, e.target.value)} />
        </Field>
      </div>
    );
  }
  return (
    <Field label={def.label}>
      <input className="input" value={(raw as string) || ''} onChange={(e) => onChange(def.key, e.target.value)} />
    </Field>
  );
}
