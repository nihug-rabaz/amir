import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { facilityService } from '../services/FacilityService.js';
import { standardsService } from '../services/StandardsService.js';
import { auditService } from '../services/AuditService.js';
import { router } from '../core/Router.js';
import { store } from '../core/Store.js';
import { PermissionService } from '../services/PermissionService.js';
import { StatusPill, ComplianceCell, GapStatusBadge } from '../components/StatusPill.js';
import { fmtDateTime, fmtNumber, fmtDate } from '../core/utils.js';
import { ITEM_CATEGORIES, INVENTORY_ITEMS } from '../data/items.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class FacilityDetailView extends Component {
  constructor(props) {
    super(props);
    this.state = { activeTab: 'overview' };
  }

  render() {
    const facility = facilityService.find(this.props.id);
    if (!facility) {
      return `<div class="card card-padded"><div class="empty-state"><h4>מתקן לא נמצא</h4><div>ייתכן שהמתקן נמחק</div><button class="btn btn-primary mt-3" data-go="/facilities">חזרה לרשימה</button></div></div>`;
    }
    const cmp = standardsService.compareFacility(facility);
    const user = store.get('currentUser');
    const canEdit = PermissionService.can(user, 'edit:facility', { facility });
    const auditEntries = auditService.forEntity('facility', facility.id);

    return html`
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <a data-go="/facilities">מתקנים</a>
            <span class="sep">›</span>
            <span>${escapeHtml(facility.name)}</span>
          </div>
          <h1 class="page-title">${escapeHtml(facility.name)} ${StatusPill.render(facility.status)}</h1>
          <div class="page-subtitle">${escapeHtml(facility.command)} · ${escapeHtml(facility.division)} · ${escapeHtml(facility.brigade)} · ${escapeHtml(facility.battalion)}</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" data-go="/facilities">${Icons.back}<span>חזרה</span></button>
          ${canEdit ? `<button class="btn btn-primary" data-edit>${Icons.edit}<span>עריכה</span></button>` : ''}
        </div>
      </div>

      <div class="facility-summary">
        <div>
          <div class="label">סוג מחנה</div>
          <div class="value text">${escapeHtml(facility.campType || '—')}</div>
        </div>
        <div>
          <div class="label">סד״כ</div>
          <div class="value">${fmtNumber(facility.maxCapacity)}</div>
        </div>
        <div>
          <div class="label">תקן רלוונטי</div>
          <div class="value text">${escapeHtml(cmp.tier.label)}</div>
        </div>
        <div>
          <div class="label">עמידה בתקן</div>
          <div class="value">${cmp.compliancePct}%</div>
        </div>
        <div>
          <div class="label">פריטים חסרים</div>
          <div class="value" style="color: ${cmp.totalGap > 0 ? '#fca5a5' : '#86efac'};">${fmtNumber(cmp.totalGap)}</div>
        </div>
        <div>
          <div class="label">עדכון אחרון</div>
          <div class="value text">${fmtDate(facility.updatedAt)}</div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab ${this.state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">סקירה כללית</div>
        <div class="tab ${this.state.activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory">מלאי ופערים <span class="tab-badge">${cmp.missingItems}</span></div>
        <div class="tab ${this.state.activeTab === 'infra' ? 'active' : ''}" data-tab="infra">תשתיות</div>
        <div class="tab ${this.state.activeTab === 'history' ? 'active' : ''}" data-tab="history">היסטוריית שינויים</div>
      </div>

      <div>
        ${this.renderTab(facility, cmp, auditEntries, canEdit)}
      </div>
    `;
  }

  renderTab(facility, cmp, auditEntries, canEdit) {
    switch (this.state.activeTab) {
      case 'overview': return this.renderOverview(facility, cmp);
      case 'inventory': return this.renderInventory(facility, cmp, canEdit);
      case 'infra': return this.renderInfra(facility);
      case 'history': return this.renderHistory(auditEntries);
    }
  }

  renderOverview(facility, cmp) {
    const f = facility;
    const k = facility.fields || {};
    return `
      <div class="grid grid-2">
        <div class="card card-padded">
          <h3 class="card-title">${Icons.building}פרטי מתקן</h3>
          ${this.detailRow('שם המתקן', f.name)}
          ${this.detailRow('פיקוד', f.command)}
          ${this.detailRow('אוגדה', f.division)}
          ${this.detailRow('חטיבה', f.brigade)}
          ${this.detailRow('גדוד', f.battalion)}
          ${this.detailRow('סוג מחנה', f.campType)}
          ${this.detailRow('פרויקט', f.project)}
          ${this.detailRow('סד״כ מקסימלי', fmtNumber(f.maxCapacity))}
          ${this.detailRow('סד״כ מתכלכלים', fmtNumber(f.mealCapacity))}
          ${this.detailRow('עודכן ע״י', f.updatedBy)}
          ${this.detailRow('עדכון אחרון', fmtDateTime(f.updatedAt))}
        </div>
        <div class="card card-padded">
          <h3 class="card-title">${Icons.scale}סטטוס עמידה בתקן</h3>
          <div class="text-strong" style="font-size: 28px; font-family: var(--font-num);">${cmp.compliancePct}%</div>
          <div class="progress mt-2 ${cmp.compliancePct >= 90 ? '' : cmp.compliancePct >= 70 ? 'warning' : 'danger'}">
            <div class="progress-bar" style="width:${cmp.compliancePct}%"></div>
          </div>
          <div class="grid grid-2 mt-4">
            <div>
              <div class="text-muted text-small">סה״כ פריטים חסרים</div>
              <div class="text-strong" style="font-size: 20px; color: var(--color-danger);">${fmtNumber(cmp.totalGap)}</div>
            </div>
            <div>
              <div class="text-muted text-small">סה״כ פריטים בעודף</div>
              <div class="text-strong" style="font-size: 20px; color: var(--color-info);">${fmtNumber(cmp.totalSurplus)}</div>
            </div>
          </div>
          ${f.notes ? `
            <div class="card-section">
              <div class="text-muted text-small mb-2">הערות</div>
              <div style="background: var(--color-surface-2); padding: 10px 12px; border-radius: 8px; border-inline-start: 3px solid var(--color-accent); white-space: pre-line;">${escapeHtml(f.notes)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="grid grid-2 mt-4">
        <div class="card card-padded">
          <h3 class="card-title">${Icons.book}בית כנסת</h3>
          ${this.detailRow('קיים בית כנסת', k.synagogueExists ? 'כן' : 'לא')}
          ${this.detailRow('מקומות גברים', fmtNumber(k.seatsMen))}
          ${this.detailRow('מקומות נשים', fmtNumber(k.seatsWomen))}
          ${this.detailRow('דלת נשים נפרדת', k.separateEntranceWomen ? 'כן' : 'לא')}
          ${this.detailRow('כיור נטילת ידיים', k.hasNetilatHandwash ? 'כן' : 'לא')}
        </div>
        <div class="card card-padded">
          <h3 class="card-title">${Icons.scroll}מזוזות</h3>
          ${this.detailRow('דרושות (חדרי מגורים)', fmtNumber(k.mezuzotResidentialNeeded))}
          ${this.detailRow('מותקנות (חדרי מגורים)', fmtNumber(k.mezuzotResidentialInstalled))}
          ${this.detailRow('דרושות (שאר דלתות)', fmtNumber(k.mezuzotOtherNeeded))}
          ${this.detailRow('מותקנות (שאר דלתות)', fmtNumber(k.mezuzotOtherInstalled))}
        </div>
      </div>
    `;
  }

  renderInventory(facility, cmp, canEdit) {
    const grouped = cmp.rows.reduce((acc, r) => { (acc[r.category] ||= []).push(r); return acc; }, {});
    return `
      <div class="card card-padded mb-3" style="display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap: wrap;">
        <div>
          <div class="text-muted text-small">תקן רלוונטי לסד״כ ${escapeHtml(String(facility.maxCapacity))}</div>
          <div class="text-strong" style="font-size: 16px;">${escapeHtml(cmp.tier.label)}</div>
        </div>
        ${canEdit ? `<button class="btn btn-primary" data-edit-inventory>${Icons.edit}<span>עדכון מלאי</span></button>` : ''}
      </div>

      <div class="list-stack">
        ${Object.entries(grouped).map(([cat, items]) => `
          <div class="card">
            <div style="padding: 14px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-2);">
              <strong>${escapeHtml(ITEM_CATEGORIES[cat] || cat)}</strong>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>פריט</th>
                  <th class="col-num">תקן נדרש</th>
                  <th class="col-num">קיים במתקן</th>
                  <th class="col-num">פער</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(r => `
                  <tr class="${r.gap > 0 ? 'gap-row-bad' : (r.gap < 0 ? '' : '')}">
                    <td><strong>${escapeHtml(r.name)}</strong></td>
                    <td class="col-num">${fmtNumber(r.required)}</td>
                    <td class="col-num">${fmtNumber(r.actual)}</td>
                    <td class="col-num"><strong style="color: ${r.gap > 0 ? 'var(--color-danger)' : r.gap < 0 ? 'var(--color-info)' : 'var(--color-text-soft)'};">${r.gap > 0 ? '-' + r.gap : r.gap < 0 ? '+' + Math.abs(r.gap) : '0'}</strong></td>
                    <td>${GapStatusBadge.render(r.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderInfra(facility) {
    const k = facility.fields || {};
    return `
      <div class="grid grid-2">
        <div class="card card-padded">
          <h3 class="card-title">מטבח וטרקלין</h3>
          ${this.detailRow('מטבח ראשי', k.mainKitchen)}
          ${this.detailRow('סוג כיריים', k.stoveType)}
          ${this.detailRow('טרקלין', k.salon ? 'קיים' : 'לא קיים')}
          ${this.detailRow('חדר מכ״ש', k.macshRoom ? 'כן' : 'לא')}
          ${this.detailRow('שולחן אור', k.lightTable ? 'כן' : 'לא')}
          ${this.detailRow('תיבת אור', k.lightBox ? 'כן' : 'לא')}
          ${this.detailRow('מכונת קמח', k.flourMachine ? 'כן' : 'לא')}
          ${this.detailRow('מכונת אורז', k.riceMachine ? `כן (${k.riceMachineSize || 'ללא ציון גודל'})` : 'לא')}
          ${this.detailRow('ארון ח. עם התקן', fmtNumber(k.warmCabinetWithDevice))}
          ${this.detailRow('ארון ח. בלי התקן', fmtNumber(k.warmCabinetNoDevice))}
          ${this.detailRow('משטחי חימום', fmtNumber(k.heatingPlates))}
          ${this.detailRow('כיסוי משטח לשבת', k.plateCoverShabbat ? 'כן' : 'לא')}
          ${this.detailRow('מטבחונים', fmtNumber(k.kitchenettes))}
          ${k.kitchenNotes ? `<div class="card-section text-small text-muted">הערות: ${escapeHtml(k.kitchenNotes)}</div>` : ''}
        </div>
        <div class="card card-padded">
          <h3 class="card-title">עירוב והתאמה לשבת</h3>
          ${this.detailRow('עירוב המתקן', k.eruv)}
          ${this.detailRow('צורת הפתח ש.ג', k.sgEntryShape)}
          ${this.detailRow('עירוב רק״מ', k.rakemEruv ? 'כן' : 'לא')}
          ${this.detailRow('עמודי עירוב נדרשים', fmtNumber(k.eruvPolesNeeded))}
          ${this.detailRow('משאבת לחץ מים', k.waterPressurePump ? 'כן' : 'לא')}
          ${this.detailRow('התאמה לשבת', k.shabbatAdaptation ? 'בוצעה' : 'לא בוצעה')}
          ${this.detailRow('התקני שבת ש.ג. נדרש', k.sgShabbatDeviceNeeded ? 'כן' : 'לא')}
          ${this.detailRow('כמות נדרשת', fmtNumber(k.sgShabbatDevicesNeeded))}
          ${this.detailRow('כמות מותקנת', fmtNumber(k.sgShabbatDevicesInstalled))}
          ${this.detailRow('מכונות קרח', fmtNumber(k.iceMachines))}
          ${this.detailRow('התקן מכונת קרח', k.iceMachineDevice ? 'קיים' : 'אין')}
          ${k.eruvNotes ? `<div class="card-section text-small text-muted">הערות עירוב: ${escapeHtml(k.eruvNotes)}</div>` : ''}
        </div>
      </div>
    `;
  }

  renderHistory(auditEntries) {
    if (auditEntries.length === 0) {
      return `<div class="card card-padded"><div class="empty-state"><h4>אין רשומות היסטוריה</h4><div>שינויים שיבוצעו במתקן יוצגו כאן</div></div></div>`;
    }
    return `
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>פעולה</th>
              <th>משתמש</th>
              <th>פרטים</th>
            </tr>
          </thead>
          <tbody>
            ${auditEntries.map(e => `
              <tr>
                <td class="text-small">${fmtDateTime(e.timestamp)}</td>
                <td><span class="badge badge-info">${escapeHtml(e.action)}</span></td>
                <td>${escapeHtml(e.user)}</td>
                <td>${escapeHtml(e.summary)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  detailRow(label, value) {
    return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(String(value ?? '—'))}</span></div>`;
  }

  afterRender() {
    this.on('[data-tab]', 'click', (e, el) => this.setState({ activeTab: el.dataset.tab }));
    this.on('[data-edit]', 'click', () => router.go(`/facilities/${this.props.id}/edit`));
    this.on('[data-go]', 'click', (e, el) => router.go(el.dataset.go));
    this.on('[data-edit-inventory]', 'click', () => router.go(`/inventory?facility=${this.props.id}`));
  }
}
