import { Component, html } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { DataTable } from '../components/DataTable.js';
import { facilityService } from '../services/FacilityService.js';
import { PermissionService } from '../services/PermissionService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { fmtNumber, fmtDate, downloadCsv } from '../core/utils.js';
import { StatusPill, ComplianceCell } from '../components/StatusPill.js';
import { COMMANDS, FACILITY_STATUS, CAMP_TYPES } from '../data/hierarchy.js';
import { Toast } from '../components/Toast.js';

export class FacilitiesView extends Component {
  render() {
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">מתקנים</h1>
          <div class="page-subtitle">רשימת המתקנים הרבנותיים בתחום אחריותך</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" data-export>${Icons.download}<span>ייצוא לאקסל</span></button>
          <button class="btn btn-primary" data-new>${Icons.plus}<span>הוספת מתקן</span></button>
        </div>
      </div>
      <div id="facilities-table"></div>
    `;
  }

  afterRender() {
    this.mountTable();
    this.on('[data-new]', 'click', () => router.go('/facilities/new'));
    this.on('[data-export]', 'click', () => this.exportCsv());
  }

  visibleFacilities() {
    const user = store.get('currentUser');
    const facilities = PermissionService.filterFacilities(user, facilityService.all());
    return facilities.map(f => {
      const enriched = facilityService.enriched(f);
      return {
        id: f.id,
        name: f.name,
        command: f.command,
        division: f.division,
        brigade: f.brigade,
        battalion: f.battalion,
        campType: f.campType,
        status: f.status,
        maxCapacity: f.maxCapacity,
        updatedAt: f.updatedAt,
        compliancePct: enriched.compliance.compliancePct,
        gaps: enriched.compliance.totalGap,
        missingItems: enriched.compliance.missingItems,
        active: f.active,
      };
    });
  }

  mountTable() {
    const host = this.q('#facilities-table');
    const search = (store.get('search') || '').trim();
    const table = new DataTable({
      rows: this.visibleFacilities(),
      searchableFields: ['name', 'command', 'division', 'brigade', 'battalion', 'campType'],
      defaultSort: { key: 'compliancePct', dir: 'asc' },
      defaultFilters: search ? {} : {},
      filters: [
        { key: 'command', label: 'פיקוד', options: COMMANDS.map(c => ({ value: c, label: c })) },
        { key: 'status', label: 'סטטוס', options: FACILITY_STATUS.map(s => ({ value: s, label: s })) },
        { key: 'campType', label: 'סוג מחנה', options: CAMP_TYPES.map(t => ({ value: t, label: t })) },
      ],
      columns: [
        { key: 'name', label: 'שם המתקן', render: r => `<strong>${escapeText(r.name)}</strong>${!r.active ? ' <span class="badge badge-neutral">לא פעיל</span>' : ''}` },
        { key: 'command', label: 'פיקוד' },
        { key: 'division', label: 'אוגדה' },
        { key: 'brigade', label: 'חטיבה' },
        { key: 'battalion', label: 'גדוד' },
        { key: 'campType', label: 'סוג מחנה' },
        { key: 'status', label: 'סטטוס', render: r => StatusPill.render(r.status) },
        { key: 'maxCapacity', label: 'סד״כ', center: true, render: r => fmtNumber(r.maxCapacity) },
        { key: 'compliancePct', label: 'עמידה בתקן', render: r => ComplianceCell.render(r.compliancePct) },
        { key: 'gaps', label: 'חוסרים', center: true, render: r => r.gaps > 0 ? `<strong style="color:var(--color-danger);">${fmtNumber(r.gaps)}</strong>` : '<span class="text-muted">0</span>' },
        { key: 'updatedAt', label: 'עדכון אחרון', render: r => `<span class="text-small text-muted">${fmtDate(r.updatedAt)}</span>`, sortValue: r => new Date(r.updatedAt).getTime() },
        { key: 'actions', label: '', sortable: false, render: r => `
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn btn-sm btn-ghost" data-action="view" data-id="${r.id}">${Icons.eye}</button>
            <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${r.id}">${Icons.edit}</button>
          </div>
        `},
      ],
      paginate: true,
      pageSize: 12,
      onRowClick: (row) => router.go(`/facilities/${row.id}`),
    });
    table.mount(host);
    if (search) table.setState({ search });

    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.action === 'view') router.go(`/facilities/${id}`);
      else if (btn.dataset.action === 'edit') router.go(`/facilities/${id}/edit`);
    });
  }

  exportCsv() {
    const rows = this.visibleFacilities().map(r => ({
      'שם מתקן': r.name,
      'פיקוד': r.command,
      'אוגדה': r.division,
      'חטיבה': r.brigade,
      'גדוד': r.battalion,
      'סוג מחנה': r.campType,
      'סטטוס': r.status,
      'סד״כ': r.maxCapacity,
      'עמידה בתקן (%)': r.compliancePct,
      'פריטים חסרים': r.gaps,
      'תאריך עדכון': fmtDate(r.updatedAt),
    }));
    downloadCsv('amir-facilities.csv', rows);
    Toast.success('ייצוא הושלם', `הורדו ${rows.length} שורות לקובץ CSV`);
  }
}

function escapeText(s) { return String(s ?? '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
