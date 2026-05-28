'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AuditEntry, Compliance, Facility } from '@/lib/types';
import { ITEM_CATEGORIES } from '@/lib/catalog';
import { fmtDate, fmtDateTime, fmtNumber } from '@/lib/format';
import { ComplianceCell, GapStatusBadge, StatusPill } from '@/components/StatusPill';
import { IconBack, IconBook, IconBuilding, IconEdit, IconScale, IconScroll } from '@/components/Icon';

type Tab = 'overview' | 'inventory' | 'infra' | 'history';

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/facilities/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setFacility(j.facility);
        setCompliance(j.compliance);
        setAudit(j.audit || []);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="card card-padded text-bad">שגיאה: {error}</div>;
  if (!facility || !compliance) return <div className="card card-padded text-slate-500">טוען…</div>;

  const k = facility.fields || {};
  const grouped = compliance.rows.reduce<Record<string, typeof compliance.rows>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <Link href="/facilities" className="hover:text-primary">מתקנים</Link>
            <span className="opacity-50 mx-1">›</span>
            <span>{facility.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0 flex flex-wrap items-center gap-2 sm:gap-3">
            {facility.name}
            <StatusPill status={facility.status} />
          </h1>
          <div className="text-sm text-slate-500 mt-1">
            {facility.command} · {facility.division} · {facility.brigade} · {facility.battalion}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/facilities')} className="btn btn-ghost"><IconBack /> חזרה</button>
          <Link href={`/facilities/${facility.id}/edit`} className="btn btn-primary"><IconEdit /> עריכה</Link>
        </div>
      </div>

      <div
        className="grid gap-4 p-5 rounded-xl text-white"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', background: 'linear-gradient(135deg, #0f2a44 0%, #1f4d7a 100%)' }}
      >
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">סוג מחנה</div><div className="text-lg font-bold mt-1">{facility.campType || '—'}</div></div>
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">סד״כ</div><div className="text-lg font-bold font-num mt-1">{fmtNumber(facility.maxCapacity)}</div></div>
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">תקן רלוונטי</div><div className="text-lg font-bold mt-1">{compliance.tier.label}</div></div>
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">עמידה בתקן</div><div className="text-lg font-bold font-num mt-1">{compliance.compliancePct}%</div></div>
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">פריטים חסרים</div><div className="text-lg font-bold font-num mt-1" style={{ color: compliance.totalGap > 0 ? '#fca5a5' : '#86efac' }}>{fmtNumber(compliance.totalGap)}</div></div>
        <div><div className="text-[11px] uppercase opacity-70 font-bold tracking-wide">עדכון אחרון</div><div className="text-lg font-bold mt-1">{fmtDate(facility.updatedAt)}</div></div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>סקירה כללית</div>
        <div className={`tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
          מלאי ופערים <span className="badge badge-bad mr-1">{compliance.missingItems}</span>
        </div>
        <div className={`tab ${tab === 'infra' ? 'active' : ''}`} onClick={() => setTab('infra')}>תשתיות</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>היסטוריית שינויים</div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card card-padded">
            <h3 className="font-bold mb-3 flex items-center gap-2"><IconBuilding className="text-primary-600" /> פרטי מתקן</h3>
            <DetailList rows={[
              ['שם המתקן', facility.name],
              ['פיקוד', facility.command],
              ['אוגדה', facility.division],
              ['חטיבה', facility.brigade],
              ['גדוד', facility.battalion],
              ['סוג מחנה', facility.campType],
              ['פרויקט', facility.project],
              ['סד״כ מקסימלי', fmtNumber(facility.maxCapacity)],
              ['סד״כ מתכלכלים', fmtNumber(facility.mealCapacity)],
              ['עודכן ע״י', facility.updatedBy],
              ['עדכון אחרון', fmtDateTime(facility.updatedAt)],
            ]} />
          </div>
          <div className="card card-padded">
            <h3 className="font-bold mb-3 flex items-center gap-2"><IconScale className="text-primary-600" /> סטטוס עמידה בתקן</h3>
            <div className="font-num font-bold text-3xl">{compliance.compliancePct}%</div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full" style={{
                width: `${compliance.compliancePct}%`,
                background: compliance.compliancePct >= 90 ? '#16a34a' : compliance.compliancePct >= 70 ? '#ea7c1d' : '#c53030',
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div className="text-xs text-slate-500">סה״כ חסרים</div>
                <div className="text-xl font-bold text-bad">{fmtNumber(compliance.totalGap)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">סה״כ עודף</div>
                <div className="text-xl font-bold text-info">{fmtNumber(compliance.totalSurplus)}</div>
              </div>
            </div>
            {facility.notes && (
              <div className="mt-4 bg-slate-50 p-3 rounded-lg border-r-4 border-accent text-sm whitespace-pre-line">
                {facility.notes}
              </div>
            )}
          </div>

          <div className="card card-padded">
            <h3 className="font-bold mb-3 flex items-center gap-2"><IconBook className="text-primary-600" /> בית כנסת</h3>
            <DetailList rows={[
              ['קיים בית כנסת', k.synagogueExists ? 'כן' : 'לא'],
              ['מקומות גברים', fmtNumber(k.seatsMen)],
              ['מקומות נשים', fmtNumber(k.seatsWomen)],
              ['דלת נשים נפרדת', k.separateEntranceWomen ? 'כן' : 'לא'],
              ['כיור נטילת ידיים', k.hasNetilatHandwash ? 'כן' : 'לא'],
            ]} />
          </div>
          <div className="card card-padded">
            <h3 className="font-bold mb-3 flex items-center gap-2"><IconScroll className="text-primary-600" /> מזוזות</h3>
            <DetailList rows={[
              ['דרושות (חדרי מגורים)', fmtNumber(k.mezuzotResidentialNeeded)],
              ['מותקנות (חדרי מגורים)', fmtNumber(k.mezuzotResidentialInstalled)],
              ['דרושות (שאר דלתות)', fmtNumber(k.mezuzotOtherNeeded)],
              ['מותקנות (שאר דלתות)', fmtNumber(k.mezuzotOtherInstalled)],
            ]} />
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-3">
          <div className="card card-padded flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-500">תקן רלוונטי לסד״כ {fmtNumber(facility.maxCapacity)}</div>
              <div className="text-base font-bold">{compliance.tier.label}</div>
            </div>
            <Link href={`/inventory?facility=${facility.id}`} className="btn btn-primary"><IconEdit /> עדכון מלאי</Link>
          </div>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-bold">{ITEM_CATEGORIES[cat] || cat}</div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>פריט</th>
                      <th className="text-center">תקן נדרש</th>
                      <th className="text-center">קיים במתקן</th>
                      <th className="text-center">פער</th>
                      <th>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.itemId} className={r.gap > 0 ? 'bg-bad/5' : ''}>
                        <td><strong>{r.name}</strong></td>
                        <td className="text-center font-num">{fmtNumber(r.required)}</td>
                        <td className="text-center font-num">{fmtNumber(r.actual)}</td>
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
      )}

      {tab === 'infra' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card card-padded">
            <h3 className="font-bold mb-3">מטבח וטרקלין</h3>
            <DetailList rows={[
              ['מטבח ראשי', k.mainKitchen],
              ['סוג כיריים', k.stoveType],
              ['טרקלין', k.salon ? 'קיים' : 'לא קיים'],
              ['חדר מכ״ש', k.macshRoom ? 'כן' : 'לא'],
              ['שולחן אור', k.lightTable ? 'כן' : 'לא'],
              ['תיבת אור', k.lightBox ? 'כן' : 'לא'],
              ['מכונת אורז', k.riceMachine ? (k.riceMachineSize || 'כן') : 'לא'],
              ['ארון ח. עם התקן', fmtNumber(k.warmCabinetWithDevice)],
              ['משטחי חימום', fmtNumber(k.heatingPlates)],
              ['מטבחונים', fmtNumber(k.kitchenettes)],
            ]} />
          </div>
          <div className="card card-padded">
            <h3 className="font-bold mb-3">עירוב והתאמה לשבת</h3>
            <DetailList rows={[
              ['עירוב המתקן', k.eruv],
              ['צורת הפתח ש.ג', k.sgEntryShape],
              ['עירוב רק״מ', k.rakemEruv ? 'כן' : 'לא'],
              ['עמודי עירוב נדרשים', fmtNumber(k.eruvPolesNeeded)],
              ['משאבת לחץ מים', k.waterPressurePump ? 'כן' : 'לא'],
              ['התאמה לשבת', k.shabbatAdaptation ? 'בוצעה' : 'לא בוצעה'],
              ['התקני שבת ש.ג. נדרשים', fmtNumber(k.sgShabbatDevicesNeeded)],
              ['התקני שבת ש.ג. מותקנים', fmtNumber(k.sgShabbatDevicesInstalled)],
              ['מכונות קרח', fmtNumber(k.iceMachines)],
            ]} />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          {audit.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <h4 className="font-bold text-slate-900">אין רשומות היסטוריה</h4>
              <div className="text-xs mt-1">שינויים שיבוצעו במתקן יוצגו כאן</div>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr><th>תאריך</th><th>פעולה</th><th>משתמש</th><th>פרטים</th></tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id}>
                      <td className="text-xs">{fmtDateTime(e.timestamp)}</td>
                      <td><span className="badge badge-info">{e.action}</span></td>
                      <td>{e.user}</td>
                      <td>{e.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailList({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="divide-y divide-dashed divide-slate-200">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex items-center justify-between py-2 gap-4">
          <span className="text-xs text-slate-500 font-semibold">{label}</span>
          <span className="text-sm font-semibold text-slate-900 text-end">{value == null || value === '' ? '—' : String(value)}</span>
        </div>
      ))}
    </div>
  );
}
