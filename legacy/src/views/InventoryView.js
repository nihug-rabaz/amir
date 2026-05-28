import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { facilityService } from '../services/FacilityService.js';
import { standardsService } from '../services/StandardsService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { PermissionService } from '../services/PermissionService.js';
import { ITEM_CATEGORIES, INVENTORY_ITEMS } from '../data/items.js';
import { Toast } from '../components/Toast.js';
import { GapStatusBadge } from '../components/StatusPill.js';
import { fmtNumber } from '../core/utils.js';

export class InventoryView extends Component {
  constructor(props) {
    super(props);
    const initialId = props.facilityId || this.parseQuery().facility || null;
    this.state = {
      selectedId: initialId,
      draft: {},
      activeCategory: 'all',
    };
    if (initialId) this.loadFacility(initialId);
  }

  parseQuery() {
    const hash = location.hash.split('?')[1] || '';
    const params = new URLSearchParams(hash);
    return Object.fromEntries(params.entries());
  }

  loadFacility(id) {
    const f = facilityService.find(id);
    if (!f) return;
    this.state.selectedId = id;
    this.state.draft = { ...f.inventory };
  }

  render() {
    const user = store.get('currentUser');
    const facilities = PermissionService.filterFacilities(user, facilityService.all()).filter(f => f.active);
    const selected = this.state.selectedId ? facilityService.find(this.state.selectedId) : null;
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">עדכון מלאי</h1>
          <div class="page-subtitle">בחר מתקן, הזן כמויות מעודכנות והשווה לתקן רבצ״ר</div>
        </div>
      </div>

      <div class="card card-padded mb-3">
        <div class="form-grid">
          <div class="form-group">
            <label>בחר מתקן</label>
            <select class="form-control" data-select-facility>
              <option value="">— בחר מתקן —</option>
              ${facilities.map(f => `<option value="${escapeHtml(f.id)}" ${this.state.selectedId === f.id ? 'selected' : ''}>${escapeHtml(f.name)} · ${escapeHtml(f.command)}</option>`).join('')}
            </select>
          </div>
          ${selected ? `
            <div class="form-group">
              <label>סד״כ מתקן</label>
              <div class="form-control" style="background: var(--color-surface-3);">${fmtNumber(selected.maxCapacity)}</div>
            </div>
            <div class="form-group">
              <label>תקן רלוונטי</label>
              <div class="form-control" style="background: var(--color-surface-3);">${escapeHtml(standardsService.tierFor(selected.maxCapacity).label)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      ${selected ? this.renderItems(selected) : this.emptyState()}
    `;
  }

  emptyState() {
    return `
      <div class="card card-padded">
        <div class="empty-state">
          <div class="empty-icon">${Icons.boxes}</div>
          <h4>בחר מתקן להתחיל</h4>
          <div>לאחר בחירת מתקן יוצגו כאן רשימת הפריטים, התקן הנדרש והמלאי הנוכחי</div>
        </div>
      </div>
    `;
  }

  renderItems(facility) {
    const cmp = standardsService.compareFacility({ ...facility, inventory: this.state.draft });
    const grouped = cmp.rows.reduce((acc, r) => { (acc[r.category] ||= []).push(r); return acc; }, {});
    const categories = Object.keys(grouped);
    const filteredCats = this.state.activeCategory === 'all' ? categories : [this.state.activeCategory].filter(c => grouped[c]);

    return `
      <div class="tabs" style="margin-bottom: 14px;">
        <div class="tab ${this.state.activeCategory === 'all' ? 'active' : ''}" data-cat="all">כל הקטגוריות</div>
        ${categories.map(c => `<div class="tab ${this.state.activeCategory === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(ITEM_CATEGORIES[c] || c)}</div>`).join('')}
      </div>

      <div class="list-stack">
        ${filteredCats.map(cat => `
          <div class="card">
            <div style="padding: 14px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-2); display:flex; justify-content:space-between; align-items:center;">
              <strong>${escapeHtml(ITEM_CATEGORIES[cat] || cat)}</strong>
              <small class="text-muted">${grouped[cat].length} פריטים</small>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>פריט</th>
                  <th class="col-num">תקן נדרש</th>
                  <th style="width:140px;">כמות במתקן</th>
                  <th class="col-num">פער</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                ${grouped[cat].map(r => `
                  <tr class="${r.gap > 0 ? 'gap-row-bad' : ''}">
                    <td><strong>${escapeHtml(r.name)}</strong></td>
                    <td class="col-num">${fmtNumber(r.required)}</td>
                    <td><input type="number" min="0" class="form-control" style="text-align:center;" value="${escapeHtml(String(this.state.draft[r.itemId] ?? 0))}" data-inv="${escapeHtml(r.itemId)}" /></td>
                    <td class="col-num"><strong style="color: ${r.gap > 0 ? 'var(--color-danger)' : r.gap < 0 ? 'var(--color-info)' : 'var(--color-text-soft)'};">${r.gap > 0 ? '-' + r.gap : r.gap < 0 ? '+' + Math.abs(r.gap) : '0'}</strong></td>
                    <td>${GapStatusBadge.render(r.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost" data-cancel>${Icons.x}<span>ביטול</span></button>
        <button class="btn btn-primary" data-save>${Icons.check}<span>שמירת מלאי</span></button>
      </div>
    `;
  }

  afterRender() {
    this.on('[data-select-facility]', 'change', (e, el) => {
      if (!el.value) {
        this.state.selectedId = null;
        this.update();
        return;
      }
      this.loadFacility(el.value);
      this.update();
    });
    this.on('[data-cat]', 'click', (e, el) => this.setState({ activeCategory: el.dataset.cat }));
    this.on('[data-inv]', 'input', (e, el) => {
      this.state.draft[el.dataset.inv] = Math.max(0, Number(el.value) || 0);
      this.recomputeRow(el);
    });
    this.on('[data-save]', 'click', () => this.save());
    this.on('[data-cancel]', 'click', () => {
      const f = facilityService.find(this.state.selectedId);
      if (f) { this.state.draft = { ...f.inventory }; this.update(); }
    });
  }

  recomputeRow(input) {
    const facility = facilityService.find(this.state.selectedId);
    if (!facility) return;
    const cmp = standardsService.compareFacility({ ...facility, inventory: this.state.draft });
    const row = input.closest('tr');
    const r = cmp.rows.find(x => x.itemId === input.dataset.inv);
    if (!r || !row) return;
    const cells = row.querySelectorAll('td');
    const gapCell = cells[3];
    const statusCell = cells[4];
    gapCell.innerHTML = `<strong style="color: ${r.gap > 0 ? 'var(--color-danger)' : r.gap < 0 ? 'var(--color-info)' : 'var(--color-text-soft)'};">${r.gap > 0 ? '-' + r.gap : r.gap < 0 ? '+' + Math.abs(r.gap) : '0'}</strong>`;
    statusCell.innerHTML = GapStatusBadge.render(r.status);
    row.classList.toggle('gap-row-bad', r.gap > 0);
  }

  save() {
    if (!this.state.selectedId) return;
    const actor = store.get('currentUser');
    facilityService.updateInventory(this.state.selectedId, this.state.draft, actor);
    Toast.success('מלאי נשמר בהצלחה', 'הנתונים עודכנו ותועדו ביומן השינויים');
    this.update();
  }
}
