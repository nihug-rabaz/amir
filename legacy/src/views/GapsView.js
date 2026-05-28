import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { DataTable } from '../components/DataTable.js';
import { facilityService } from '../services/FacilityService.js';
import { standardsService } from '../services/StandardsService.js';
import { PermissionService } from '../services/PermissionService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { fmtNumber, downloadCsv } from '../core/utils.js';
import { ITEM_CATEGORIES } from '../data/items.js';
import { GapStatusBadge } from '../components/StatusPill.js';
import { COMMANDS } from '../data/hierarchy.js';
import { Toast } from '../components/Toast.js';

export class GapsView extends Component {
  render() {
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">פערים וחוסרים</h1>
          <div class="page-subtitle">תצוגה מאוחדת של כל הפערים מול תקני רבצ״ר</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" data-export>${Icons.download}<span>ייצוא</span></button>
        </div>
      </div>

      <div id="gaps-summary" class="grid grid-4 mb-4"></div>
      <div id="gaps-table"></div>
    `;
  }

  rows() {
    const user = store.get('currentUser');
    const facilities = PermissionService.filterFacilities(user, facilityService.all());
    const rows = [];
    for (const f of facilities) {
      const cmp = standardsService.compareFacility(f);
      for (const r of cmp.rows) {
        if (r.status === 'missing' || r.status === 'surplus') {
          rows.push({
            id: `${f.id}_${r.itemId}`,
            facilityId: f.id,
            facilityName: f.name,
            command: f.command,
            division: f.division,
            brigade: f.brigade,
            battalion: f.battalion,
            item: r.name,
            category: ITEM_CATEGORIES[r.category] || r.category,
            required: r.required,
            actual: r.actual,
            gap: r.gap,
            status: r.status,
          });
        }
      }
    }
    return rows;
  }

  afterRender() {
    const allRows = this.rows();
    const missing = allRows.filter(r => r.status === 'missing');
    const surplus = allRows.filter(r => r.status === 'surplus');
    const totalMissingUnits = missing.reduce((s, r) => s + r.gap, 0);
    const totalSurplusUnits = surplus.reduce((s, r) => s + Math.abs(r.gap), 0);

    const sum = document.getElementById('gaps-summary');
    sum.innerHTML = `
      <div class="kpi"><div class="kpi-icon danger">${Icons.alert}</div><div class="kpi-content"><span class="kpi-label">פריטים חסרים</span><span class="kpi-value">${fmtNumber(missing.length)}</span><span class="kpi-delta">${fmtNumber(totalMissingUnits)} יחידות בסה״כ</span></div></div>
      <div class="kpi"><div class="kpi-icon info">${Icons.boxes}</div><div class="kpi-content"><span class="kpi-label">פריטים בעודף</span><span class="kpi-value">${fmtNumber(surplus.length)}</span><span class="kpi-delta">${fmtNumber(totalSurplusUnits)} יחידות בסה״כ</span></div></div>
      <div class="kpi"><div class="kpi-icon warning">${Icons.building}</div><div class="kpi-content"><span class="kpi-label">מתקנים עם פערים</span><span class="kpi-value">${fmtNumber(new Set(missing.map(r => r.facilityId)).size)}</span></div></div>
      <div class="kpi"><div class="kpi-icon accent">${Icons.scroll}</div><div class="kpi-content"><span class="kpi-label">סוגי פריטים</span><span class="kpi-value">${fmtNumber(new Set(missing.map(r => r.item)).size)}</span></div></div>
    `;

    const table = new DataTable({
      rows: allRows,
      searchableFields: ['facilityName', 'item', 'command', 'division'],
      defaultSort: { key: 'gap', dir: 'desc' },
      filters: [
        { key: 'command', label: 'פיקוד', options: COMMANDS.map(c => ({ value: c, label: c })) },
        { key: 'status', label: 'סוג', options: [{ value: 'missing', label: 'חסר' }, { value: 'surplus', label: 'עודף' }] },
      ],
      columns: [
        { key: 'facilityName', label: 'מתקן', render: r => `<strong>${escapeHtml(r.facilityName)}</strong>` },
        { key: 'command', label: 'פיקוד' },
        { key: 'division', label: 'אוגדה' },
        { key: 'item', label: 'פריט' },
        { key: 'category', label: 'קטגוריה' },
        { key: 'required', label: 'תקן', center: true },
        { key: 'actual', label: 'קיים', center: true },
        { key: 'gap', label: 'פער', center: true, render: r => `<strong style="color: ${r.gap > 0 ? 'var(--color-danger)' : 'var(--color-info)'};">${r.gap > 0 ? '-' + r.gap : '+' + Math.abs(r.gap)}</strong>` },
        { key: 'status', label: 'סטטוס', render: r => GapStatusBadge.render(r.status) },
      ],
      paginate: true,
      pageSize: 15,
      onRowClick: (row) => router.go(`/facilities/${row.facilityId}`),
    });
    table.mount(this.q('#gaps-table'));

    this.on('[data-export]', 'click', () => {
      downloadCsv('amir-gaps.csv', allRows.map(r => ({
        'מתקן': r.facilityName, 'פיקוד': r.command, 'אוגדה': r.division,
        'פריט': r.item, 'קטגוריה': r.category, 'תקן': r.required, 'קיים': r.actual,
        'פער': r.gap, 'סטטוס': r.status === 'missing' ? 'חסר' : 'עודף',
      })));
      Toast.success('ייצוא הושלם', 'הנתונים יוצאו בהצלחה');
    });
  }
}
