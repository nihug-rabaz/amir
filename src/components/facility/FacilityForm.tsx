'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Facility, FacilityFields, InventoryItem, StandardTier, User } from '@/lib/types';
import {
  COMMANDS, CAMP_TYPES, FACILITY_STATUS, PROJECT_TYPES, ITEM_CATEGORIES,
  divisionsFor, brigadesFor, battalionsFor,
} from '@/lib/catalog';
import { fmtNumber } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { IconBack, IconBoxes, IconCheck } from '@/components/Icon';
import { GapStatusBadge } from '@/components/StatusPill';
import { Field, NumField, Check } from './fieldControls';

type Tab = 'details' | 'kitchen' | 'eruv' | 'mezuzot' | 'synagogue' | 'contents' | 'inventory';

interface Props {
  mode: 'new' | 'edit';
  initial?: Facility | null;
  actor: User | null;
}

interface FormData {
  name: string;
  command: string;
  division: string;
  brigade: string;
  battalion: string;
  campType: string;
  status: string;
  project: string;
  maxCapacity: number;
  mealCapacity: number;
  notes: string;
  active: boolean;
  fields: FacilityFields;
}

function emptyForm(): FormData {
  return {
    name: '', command: '', division: '', brigade: '', battalion: '',
    campType: '', status: '', project: 'שגרה',
    maxCapacity: 0, mealCapacity: 0, notes: '', active: true,
    fields: {
      mainKitchen: '', stoveType: '',
      salon: false, macshRoom: false, lightTable: false, lightBox: false,
      flourMachine: false, riceMachine: false, riceMachineSize: '',
      warmCabinetWithDevice: 0, warmCabinetNoDevice: 0, heatingPlates: 0, plateSeparatorMilk: 0,
      plateCoverShabbat: false, galeyShabbat: false, pesachStore: false, kitchenettes: 0, kitchenNotes: '',
      eruv: '', sgEntryShape: '', rakemEruv: false, eruvPolesNeeded: 0, eruvNotes: '',
      waterPressurePump: false, shabbatAdaptation: false, sgShabbatDeviceNeeded: false,
      sgShabbatDevicesNeeded: 0, sgShabbatDevicesInstalled: 0, iceMachines: 0, iceMachineDevice: false, shabbatNotes: '',
      mezuzotResidentialNeeded: 0, mezuzotResidentialInstalled: 0,
      mezuzotOtherNeeded: 0, mezuzotOtherInstalled: 0, mezuzotNotes: '',
      synagogueExists: false, synagogueStatus: '', seatsMen: 0, seatsWomen: 0,
      separateEntranceWomen: false, hasNetilatHandwash: false, gnizaBox: false, synagogueNotes: '',
      arkKodesh: false, parochet: false, bimaReading: false, bimaCover: false,
      chazzanStand: false, chazzanStandCover: false,
      bookCabinets: 0, bookShelves: 0, torahScrolls: 0, synagogueContentsNotes: '',
    },
  };
}

function mapInitial(initial?: Facility | null): FormData {
  if (!initial) return emptyForm();
  return {
    name: initial.name,
    command: initial.command,
    division: initial.division || '',
    brigade: initial.brigade || '',
    battalion: initial.battalion || '',
    campType: initial.campType || '',
    status: initial.status || '',
    project: initial.project || 'שגרה',
    maxCapacity: initial.maxCapacity,
    mealCapacity: initial.mealCapacity,
    notes: initial.notes || '',
    active: initial.active,
    fields: { ...emptyForm().fields, ...(initial.fields || {}) },
  };
}

export function FacilityForm({ mode, initial, actor }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('details');
  const [form, setForm] = useState<FormData>(() => mapInitial(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [tiers, setTiers] = useState<StandardTier[]>([]);
  const [standards, setStandards] = useState<Record<string, Record<string, number>>>({});
  const [inventory, setInventory] = useState<Record<string, number>>({});

  const divisions = useMemo(() => divisionsFor(form.command), [form.command]);
  const brigades = useMemo(() => brigadesFor(form.division), [form.division]);
  const battalions = useMemo(() => battalionsFor(form.brigade), [form.brigade]);

  const tier = useMemo(() => {
    if (!tiers.length) return null;
    return tiers.find((t) => form.maxCapacity >= t.min && form.maxCapacity <= t.max) || tiers[tiers.length - 1] || null;
  }, [tiers, form.maxCapacity]);

  useEffect(() => {
    fetch('/api/standards')
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items || []);
        setTiers(j.tiers || []);
        setStandards(j.standards || {});
      })
      .catch(() => toast.danger('שגיאה', 'לא ניתן לטעון תקנים'));
  }, [toast]);

  useEffect(() => {
    if (mode !== 'edit' || !initial?.id) return;
    fetch(`/api/facilities/${initial.id}/inventory`)
      .then((r) => r.json())
      .then((j) => setInventory(j.inventory || {}))
      .catch(() => toast.danger('שגיאה', 'לא ניתן לטעון מלאי'));
  }, [mode, initial, toast]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function updateField<K extends keyof FacilityFields>(key: K, value: FacilityFields[K]) {
    setForm((f) => ({ ...f, fields: { ...f.fields, [key]: value } }));
  }
  function setQty(itemId: string, qty: number) {
    setInventory((d) => ({ ...d, [itemId]: Math.max(0, qty) }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'שדה חובה';
    if (!form.command) e.command = 'שדה חובה';
    if (!form.campType) e.campType = 'שדה חובה';
    if (!form.status) e.status = 'שדה חובה';
    if (form.maxCapacity < 0) e.maxCapacity = 'חייב להיות מספר חיובי';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) { setTab('details'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        command: form.command,
        division: form.division || null,
        brigade: form.brigade || null,
        battalion: form.battalion || null,
        campType: form.campType || null,
        status: form.status || null,
        project: form.project || null,
        maxCapacity: form.maxCapacity,
        mealCapacity: form.mealCapacity,
        notes: form.notes || null,
        fields: form.fields,
        active: form.active,
      };

      let facilityId: string;
      if (mode === 'new') {
        const r = await fetch('/api/facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facility: payload, actor }),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        facilityId = j.facility.id;
      } else {
        const r = await fetch(`/api/facilities/${initial!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facility: payload, actor }),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        facilityId = initial!.id;
      }

      if (Object.keys(inventory).length > 0) {
        const r = await fetch(`/api/facilities/${facilityId}/inventory`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inventory, actor }),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error);
      }

      toast.success('המתקן נשמר', mode === 'new' ? 'מתקן חדש נוצר בהצלחה' : 'פרטי המתקן עודכנו');
      router.push(`/facilities/${facilityId}`);
    } catch (e) {
      toast.danger('שגיאה בשמירה', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inventoryRows = useMemo(() => {
    const std = tier ? (standards[tier.id] || {}) : {};
    return items.map((it) => {
      const required = std[it.id] ?? 0;
      const actual = Number(inventory[it.id] ?? 0);
      const gap = required - actual;
      let status: 'ok' | 'missing' | 'surplus' | 'not-relevant';
      if (required === 0) status = 'not-relevant';
      else if (gap > 0) status = 'missing';
      else if (gap < 0) status = 'surplus';
      else status = 'ok';
      return { ...it, required, actual, gap, status };
    });
  }, [items, inventory, tier, standards]);

  const groupedInventory = useMemo(() => {
    return inventoryRows.reduce<Record<string, typeof inventoryRows>>((acc, r) => {
      (acc[r.category] ||= []).push(r);
      return acc;
    }, {});
  }, [inventoryRows]);

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'details',   label: 'פרטי מתקן' },
    { key: 'kitchen',   label: 'מטבח וטרקלין' },
    { key: 'eruv',      label: 'עירוב והתאמה לשבת' },
    { key: 'mezuzot',   label: 'מזוזות' },
    { key: 'synagogue', label: 'בית כנסת' },
    { key: 'contents',  label: 'תכולת בית כנסת' },
    { key: 'inventory', label: 'מלאי וציוד רבנותי' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <button className="hover:text-primary" onClick={() => router.push('/facilities')}>מתקנים</button>
            <span className="opacity-50 mx-1">›</span>
            <span>{mode === 'edit' ? 'עריכת מתקן' : 'הוספת מתקן'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">{mode === 'edit' ? form.name || 'עריכת מתקן' : 'הוספת מתקן חדש'}</h1>
          <div className="text-sm text-slate-500 mt-1">
            מילוי פרטים מלאים על המתקן הרבנותי
            {tier && <span className="mr-2 badge badge-info">תקן: {tier.label}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => router.back()}><IconBack /> חזרה</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}><IconCheck /> {saving ? 'שומר...' : 'שמירה'}</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</div>
        ))}
      </div>

      <div className={tab === 'inventory' ? '' : 'card card-padded'}>
        {tab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Field label="שם המתקן" req error={errors.name}><input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
            <Field label="פיקוד" req error={errors.command}>
              <select className="input" value={form.command} onChange={(e) => {
                const command = e.target.value;
                setForm((f) => ({ ...f, command, division: '', brigade: '', battalion: '' }));
              }}>
                <option value="">— בחר —</option>
                {COMMANDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="אוגדה">
              <select className="input" value={form.division} disabled={!form.command} onChange={(e) => {
                const division = e.target.value;
                setForm((f) => ({ ...f, division, brigade: '', battalion: '' }));
              }}>
                <option value="">— בחר —</option>
                {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="חטיבה">
              <select className="input" value={form.brigade} disabled={!form.division} onChange={(e) => {
                const brigade = e.target.value;
                setForm((f) => ({ ...f, brigade, battalion: '' }));
              }}>
                <option value="">— בחר —</option>
                {brigades.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="גדוד">
              <select className="input" value={form.battalion} disabled={!form.brigade} onChange={(e) => update('battalion', e.target.value)}>
                <option value="">— בחר —</option>
                {battalions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="סוג מחנה" req error={errors.campType}>
              <select className="input" value={form.campType} onChange={(e) => update('campType', e.target.value)}>
                <option value="">— בחר —</option>
                {CAMP_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="סטאטוס המתקן" req error={errors.status}>
              <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="">— בחר —</option>
                {FACILITY_STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="פרויקט הקמה / שיפוץ">
              <select className="input" value={form.project} onChange={(e) => update('project', e.target.value)}>
                {PROJECT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <NumField label="סד״כ מקסימלי" val={form.maxCapacity} set={(v) => update('maxCapacity', v)} error={errors.maxCapacity} />
            <NumField label="סד״כ מתכלכלים" val={form.mealCapacity} set={(v) => update('mealCapacity', v)} />
            <Field label="המתקן פעיל">
              <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} /> פעיל</label>
            </Field>
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="הערות פרטי המתקן"><textarea className="input min-h-20" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'kitchen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Field label="מטבח ראשי (מחמם/מבשל)"><input className="input" value={form.fields.mainKitchen || ''} onChange={(e) => updateField('mainKitchen', e.target.value)} /></Field>
            <Field label="סוג כיריים במתקן"><input className="input" value={form.fields.stoveType || ''} onChange={(e) => updateField('stoveType', e.target.value)} /></Field>
            <Check label="טרקלין" val={!!form.fields.salon} set={(v) => updateField('salon', v)} />
            <Check label="חדר מכ״ש" val={!!form.fields.macshRoom} set={(v) => updateField('macshRoom', v)} />
            <Check label="שולחן אור" val={!!form.fields.lightTable} set={(v) => updateField('lightTable', v)} />
            <Check label="תיבת אור" val={!!form.fields.lightBox} set={(v) => updateField('lightBox', v)} />
            <Check label="מכונת קמח" val={!!form.fields.flourMachine} set={(v) => updateField('flourMachine', v)} />
            <Check label="מכונת אורז" val={!!form.fields.riceMachine} set={(v) => updateField('riceMachine', v)} />
            <Field label="גודל מכונת אורז"><input className="input" value={form.fields.riceMachineSize || ''} onChange={(e) => updateField('riceMachineSize', e.target.value)} /></Field>
            <NumField label="ארון ח. עם התקן"     val={form.fields.warmCabinetWithDevice} set={(v) => updateField('warmCabinetWithDevice', v)} />
            <NumField label="ארון ח. בלי התקן"    val={form.fields.warmCabinetNoDevice}   set={(v) => updateField('warmCabinetNoDevice', v)} />
            <NumField label="עגלות / משטחי חימום"  val={form.fields.heatingPlates}         set={(v) => updateField('heatingPlates', v)} />
            <NumField label="מפריד פלטה חלבי"     val={form.fields.plateSeparatorMilk}    set={(v) => updateField('plateSeparatorMilk', v)} />
            <Check label="כיסוי משטח חימום לשבת" val={!!form.fields.plateCoverShabbat} set={(v) => updateField('plateCoverShabbat', v)} />
            <Check label="גלי שבת" val={!!form.fields.galeyShabbat} set={(v) => updateField('galeyShabbat', v)} />
            <Check label="מחסן פסח" val={!!form.fields.pesachStore} set={(v) => updateField('pesachStore', v)} />
            <NumField label="כמות מטבחונים" val={form.fields.kitchenettes} set={(v) => updateField('kitchenettes', v)} />
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="הערות מטבח וטרקלין"><textarea className="input min-h-20" value={form.fields.kitchenNotes || ''} onChange={(e) => updateField('kitchenNotes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'eruv' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Field label="עירוב המתקן"><input className="input" value={form.fields.eruv || ''} onChange={(e) => updateField('eruv', e.target.value)} /></Field>
            <Field label="צורת הפתח (ש.ג)"><input className="input" value={form.fields.sgEntryShape || ''} onChange={(e) => updateField('sgEntryShape', e.target.value)} /></Field>
            <Check label="עירוב משטח רק״מ" val={!!form.fields.rakemEruv} set={(v) => updateField('rakemEruv', v)} />
            <NumField label="עמודי עירוב נדרשים" val={form.fields.eruvPolesNeeded} set={(v) => updateField('eruvPolesNeeded', v)} />
            <Check label="משאבה להגברת לחץ מים" val={!!form.fields.waterPressurePump} set={(v) => updateField('waterPressurePump', v)} />
            <Check label="בוצעה התאמה לשבת" val={!!form.fields.shabbatAdaptation} set={(v) => updateField('shabbatAdaptation', v)} />
            <Check label="נדרש התקן שבת לש״ג" val={!!form.fields.sgShabbatDeviceNeeded} set={(v) => updateField('sgShabbatDeviceNeeded', v)} />
            <NumField label="כמות התקנים נדרשת"  val={form.fields.sgShabbatDevicesNeeded}   set={(v) => updateField('sgShabbatDevicesNeeded', v)} />
            <NumField label="כמות התקנים מותקנת" val={form.fields.sgShabbatDevicesInstalled} set={(v) => updateField('sgShabbatDevicesInstalled', v)} />
            <NumField label="מכונות קרח"        val={form.fields.iceMachines}              set={(v) => updateField('iceMachines', v)} />
            <Check label="התקן מכונת קרח לשבת" val={!!form.fields.iceMachineDevice} set={(v) => updateField('iceMachineDevice', v)} />
            <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="הערות עירובין"><textarea className="input min-h-20" value={form.fields.eruvNotes || ''} onChange={(e) => updateField('eruvNotes', e.target.value)} /></Field>
              <Field label="הערות התאמה לשבת"><textarea className="input min-h-20" value={form.fields.shabbatNotes || ''} onChange={(e) => updateField('shabbatNotes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'mezuzot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NumField label="מזוזות נדרשות (חדרי מגורים)"    val={form.fields.mezuzotResidentialNeeded}    set={(v) => updateField('mezuzotResidentialNeeded', v)} />
            <NumField label="מזוזות מותקנות (חדרי מגורים)"   val={form.fields.mezuzotResidentialInstalled} set={(v) => updateField('mezuzotResidentialInstalled', v)} />
            <NumField label="מזוזות נדרשות (שאר דלתות)"      val={form.fields.mezuzotOtherNeeded}          set={(v) => updateField('mezuzotOtherNeeded', v)} />
            <NumField label="מזוזות מותקנות (שאר דלתות)"     val={form.fields.mezuzotOtherInstalled}       set={(v) => updateField('mezuzotOtherInstalled', v)} />
            <div className="md:col-span-2">
              <Field label="הערות מזוזות"><textarea className="input min-h-20" value={form.fields.mezuzotNotes || ''} onChange={(e) => updateField('mezuzotNotes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'synagogue' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Check label="קיים בית כנסת" val={!!form.fields.synagogueExists} set={(v) => updateField('synagogueExists', v)} />
            <Field label="סטאטוס בית כנסת"><input className="input" value={form.fields.synagogueStatus || ''} onChange={(e) => updateField('synagogueStatus', e.target.value)} /></Field>
            <NumField label="מקומות ישיבה - גברים" val={form.fields.seatsMen}   set={(v) => updateField('seatsMen', v)} />
            <NumField label="מקומות ישיבה - נשים"  val={form.fields.seatsWomen} set={(v) => updateField('seatsWomen', v)} />
            <Check label="דלת כניסה נפרדת לעזרת נשים" val={!!form.fields.separateEntranceWomen} set={(v) => updateField('separateEntranceWomen', v)} />
            <Check label="כיור נטילת ידיים"          val={!!form.fields.hasNetilatHandwash}    set={(v) => updateField('hasNetilatHandwash', v)} />
            <Check label="מתקן גניזה"                val={!!form.fields.gnizaBox}               set={(v) => updateField('gnizaBox', v)} />
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="הערות בית כנסת"><textarea className="input min-h-20" value={form.fields.synagogueNotes || ''} onChange={(e) => updateField('synagogueNotes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'contents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Check label="ארון קודש"            val={!!form.fields.arkKodesh}         set={(v) => updateField('arkKodesh', v)} />
            <Check label="פרוכת לארון קודש"    val={!!form.fields.parochet}          set={(v) => updateField('parochet', v)} />
            <Check label="במת קריאה"           val={!!form.fields.bimaReading}       set={(v) => updateField('bimaReading', v)} />
            <Check label="כיסוי לתיבה"         val={!!form.fields.bimaCover}         set={(v) => updateField('bimaCover', v)} />
            <Check label="עמוד תפילה לחזן"     val={!!form.fields.chazzanStand}      set={(v) => updateField('chazzanStand', v)} />
            <Check label="כיסוי לבמת החזן"    val={!!form.fields.chazzanStandCover} set={(v) => updateField('chazzanStandCover', v)} />
            <NumField label="מספר ארונות ספרים" val={form.fields.bookCabinets}        set={(v) => updateField('bookCabinets', v)} />
            <NumField label="מספר כונניות ספרים" val={form.fields.bookShelves}        set={(v) => updateField('bookShelves', v)} />
            <NumField label="מספר ספרי תורה"    val={form.fields.torahScrolls}        set={(v) => updateField('torahScrolls', v)} />
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="הערות תכולה"><textarea className="input min-h-20" value={form.fields.synagogueContentsNotes || ''} onChange={(e) => updateField('synagogueContentsNotes', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <InventoryEditor
            grouped={groupedInventory}
            tierLabel={tier?.label}
            empty={items.length === 0}
            setQty={setQty}
            inventory={inventory}
          />
        )}
      </div>
    </div>
  );
}

interface InventoryEditorProps {
  grouped: Record<string, Array<InventoryItem & { required: number; actual: number; gap: number; status: 'ok' | 'missing' | 'surplus' | 'not-relevant' }>>;
  tierLabel?: string;
  empty: boolean;
  inventory: Record<string, number>;
  setQty: (id: string, qty: number) => void;
}

function InventoryEditor({ grouped, tierLabel, empty, inventory, setQty }: InventoryEditorProps) {
  if (empty) {
    return (
      <div className="card card-padded text-center py-10 text-slate-500">
        <div className="mx-auto w-fit text-slate-400"><IconBoxes size={36} /></div>
        <h4 className="font-bold text-slate-900 mt-2">טוען רשימת פריטים…</h4>
        <div className="text-xs mt-1">רשימת הפריטים תיטען מתוך תקני רבצ״ר</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card card-padded flex justify-between items-center flex-wrap gap-3">
        <div>
          <div className="text-xs text-slate-500">תקן רלוונטי לפי סד״כ</div>
          <div className="text-base font-bold">{tierLabel || '—'}</div>
        </div>
        <div className="text-xs text-slate-500">
          ניתן להזין כמויות מלאי לכל פריט מרשימת התקנים. השמירה תתבצע יחד עם פרטי המתקן.
        </div>
      </div>

      {Object.entries(grouped).map(([cat, rows]) => (
        <div key={cat} className="card overflow-hidden">
          <div className="flex justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <strong>{ITEM_CATEGORIES[cat] || cat}</strong>
            <small className="text-slate-500">{rows.length} פריטים</small>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>פריט</th>
                  <th className="text-center">תקן נדרש</th>
                  <th style={{ width: 140 }}>כמות במתקן</th>
                  <th className="text-center">פער</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.gap > 0 ? 'bg-bad/5' : ''}>
                    <td><strong>{r.name}</strong></td>
                    <td className="text-center font-num">{fmtNumber(r.required)}</td>
                    <td>
                      <input
                        type="number" min={0} className="input text-center"
                        value={inventory[r.id] ?? 0}
                        onChange={(e) => setQty(r.id, Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="text-center font-num font-bold" style={{ color: r.gap > 0 ? '#c53030' : r.gap < 0 ? '#2563eb' : '#64748b' }}>
                      {r.gap > 0 ? `-${r.gap}` : r.gap < 0 ? `+${Math.abs(r.gap)}` : '0'}
                    </td>
                    <td><GapStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

