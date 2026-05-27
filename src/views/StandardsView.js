import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { standardsService } from '../services/StandardsService.js';
import { store } from '../core/Store.js';
import { ROLES } from '../data/seed.js';
import { Toast } from '../components/Toast.js';
import { ITEM_CATEGORIES, INVENTORY_ITEMS, STANDARD_TIERS } from '../data/items.js';

export class StandardsView extends Component {
  constructor() {
    super();
    this.state = {
      data: structuredClone(standardsService.getStandards()),
      dirty: false,
      activeCategory: 'all',
    };
  }

  render() {
    const user = store.get('currentUser');
    const canEdit = user?.role === ROLES.ADMIN;
    const categories = Object.keys(ITEM_CATEGORIES);
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">תקני רבצ״ר (חוקה)</h1>
          <div class="page-subtitle">ניהול מדרגות תקן והכמויות הנדרשות לכל פריט</div>
        </div>
        <div class="page-actions">
          ${canEdit ? `
            <button class="btn btn-ghost" data-reset>${Icons.history}<span>איפוס לברירת מחדל</span></button>
            <button class="btn btn-primary" data-save ${this.state.dirty ? '' : 'disabled'}>${Icons.check}<span>שמירה</span></button>
          ` : `<span class="badge badge-warning">מצב צפייה בלבד</span>`}
        </div>
      </div>

      <div class="card card-padded mb-3">
        <div class="grid grid-auto">
          ${STANDARD_TIERS.map(t => `
            <div class="kpi"><div class="kpi-icon accent">${Icons.scale}</div><div class="kpi-content"><span class="kpi-label">${escapeHtml(t.label)}</span><span class="kpi-value">${t.min}-${t.max === 99999 ? '∞' : t.max}</span><span class="kpi-delta">חיילים</span></div></div>
          `).join('')}
        </div>
      </div>

      <div class="tabs">
        <div class="tab ${this.state.activeCategory === 'all' ? 'active' : ''}" data-cat="all">כל הקטגוריות</div>
        ${categories.map(c => `<div class="tab ${this.state.activeCategory === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(ITEM_CATEGORIES[c])}</div>`).join('')}
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:240px; right:0; position: sticky; background: var(--color-surface-2);">פריט</th>
                ${STANDARD_TIERS.map(t => `<th class="col-num">${escapeHtml(t.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${INVENTORY_ITEMS.filter(it => this.state.activeCategory === 'all' || it.category === this.state.activeCategory).map(item => `
                <tr>
                  <td><strong>${escapeHtml(item.name)}</strong><div class="text-muted text-small">${escapeHtml(ITEM_CATEGORIES[item.category])} · ${escapeHtml(item.unit)}</div></td>
                  ${STANDARD_TIERS.map(t => `
                    <td class="col-num">
                      ${canEdit
                        ? `<input type="number" min="0" class="form-control" style="width:80px; text-align:center; margin: 0 auto;" value="${escapeHtml(String(this.state.data[t.id]?.[item.id] ?? 0))}" data-std="${escapeHtml(t.id)}|${escapeHtml(item.id)}" />`
                        : escapeHtml(String(this.state.data[t.id]?.[item.id] ?? 0))}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.on('[data-cat]', 'click', (e, el) => this.setState({ activeCategory: el.dataset.cat }));
    this.on('[data-std]', 'input', (e, el) => {
      const [tier, itemId] = el.dataset.std.split('|');
      this.state.data[tier] ||= {};
      this.state.data[tier][itemId] = Math.max(0, Number(el.value) || 0);
      this.state.dirty = true;
      const saveBtn = this.q('[data-save]');
      if (saveBtn) saveBtn.removeAttribute('disabled');
    });
    this.on('[data-save]', 'click', () => {
      standardsService.saveStandards(this.state.data);
      this.state.dirty = false;
      Toast.success('תקנים נשמרו', 'הוראות החוקה עודכנו במערכת');
      this.update();
    });
    this.on('[data-reset]', 'click', async () => {
      const { Modal } = await import('../components/Modal.js');
      const ok = await Modal.confirm({
        title: 'איפוס לברירת מחדל',
        message: 'פעולה זו תאפס את כל התקנים לערכי ברירת המחדל. האם להמשיך?',
        confirmText: 'אפס תקנים',
        danger: true,
      });
      if (!ok) return;
      const { DEFAULT_STANDARDS } = await import('../data/items.js');
      this.state.data = structuredClone(DEFAULT_STANDARDS);
      standardsService.saveStandards(this.state.data);
      this.state.dirty = false;
      Toast.warning('התקנים אופסו', 'התקנים חזרו לערכי ברירת המחדל');
      this.update();
    });
  }
}
