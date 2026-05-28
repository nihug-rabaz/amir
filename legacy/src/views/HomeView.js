import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { facilityService } from '../services/FacilityService.js';
import { auditService } from '../services/AuditService.js';
import { PermissionService } from '../services/PermissionService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { KpiCard } from '../components/KpiCard.js';
import { StatusPill, ComplianceCell } from '../components/StatusPill.js';
import { fmtDateTime, fmtNumber } from '../core/utils.js';
import { ROLE_LABELS } from '../data/seed.js';

export class HomeView extends Component {
  render() {
    const user = store.get('currentUser');
    const visible = PermissionService.filterFacilities(user, facilityService.all());
    const sum = facilityService.summary(visible);
    const recentAudit = auditService.recent(5);

    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">שלום ${escapeHtml(user?.name || '')}</h1>
          <div class="page-subtitle">${escapeHtml(ROLE_LABELS[user?.role] || '')} · ${escapeHtml(this.scopeLabel(user))}</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" data-go="/dashboard">${Icons.chart}<span>דשבורד מלא</span></button>
          <button class="btn btn-primary" data-go="/facilities/new">${Icons.plus}<span>הוספת מתקן</span></button>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        ${KpiCard.render({ label: 'סה״כ מתקנים', value: fmtNumber(sum.total), icon: Icons.building, tone: 'info' })}
        ${KpiCard.render({ label: 'עומדים בתקן', value: fmtNumber(sum.compliant), icon: Icons.check, tone: 'success', delta: `${sum.avgCompliance}% עמידה ממוצעת` })}
        ${KpiCard.render({ label: 'פערים פתוחים', value: fmtNumber(sum.totalGaps), icon: Icons.alert, tone: 'danger', delta: 'פריטים חסרים בסה״כ' })}
        ${KpiCard.render({ label: 'מתקנים בשיפוץ', value: fmtNumber(sum.reno), icon: Icons.cog, tone: 'warning' })}
      </div>

      <div class="grid grid-2 mb-4">
        <div class="card card-padded">
          <h3 class="card-title">${Icons.bookmark}קיצורי דרך</h3>
          <div class="grid grid-2">
            ${this.shortcut('/facilities', Icons.building, 'מתקנים', 'צפייה וניהול מתקנים')}
            ${this.shortcut('/inventory', Icons.boxes, 'עדכון מלאי', 'הזנת מלאי פריטים')}
            ${this.shortcut('/gaps', Icons.alert, 'פערים', 'איתור חוסרים בתקן')}
            ${this.shortcut('/standards', Icons.scale, 'תקנים', 'חוקת רבצ״ר')}
            ${this.shortcut('/dashboard', Icons.chart, 'דשבורד', 'תצוגה ניהולית')}
            ${this.shortcut('/audit', Icons.history, 'יומן שינויים', 'תיעוד פעולות')}
          </div>
        </div>
        <div class="card card-padded">
          <h3 class="card-title">${Icons.history}פעילות אחרונה</h3>
          ${recentAudit.length === 0 ? '<div class="text-muted text-small">אין פעילות לתצוגה</div>' : `
            <div class="list-stack">
              ${recentAudit.map(e => `
                <div style="display:flex; justify-content:space-between; gap:12px; padding:10px; border:1px solid var(--color-border); border-radius:10px; background:var(--color-surface-2);">
                  <div>
                    <div class="text-strong text-small">${escapeHtml(e.summary)}</div>
                    <div class="text-muted text-small">${escapeHtml(e.user)}</div>
                  </div>
                  <div class="text-muted text-small">${fmtDateTime(e.timestamp)}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <div class="card card-padded">
        <h3 class="card-title">${Icons.alert}מתקנים שדורשים תשומת לב</h3>
        ${this.renderAttentionTable(sum.list)}
      </div>
    `;
  }

  shortcut(path, icon, title, sub) {
    return `
      <a class="card" data-go="${path}" style="cursor:pointer; padding:14px; display:flex; gap:12px; align-items:center; transition: all 150ms ease; border:1px solid var(--color-border);">
        <div class="kpi-icon accent">${icon}</div>
        <div>
          <div class="text-strong">${escapeHtml(title)}</div>
          <div class="text-muted text-small">${escapeHtml(sub)}</div>
        </div>
      </a>
    `;
  }

  renderAttentionTable(list) {
    const sorted = [...list].filter(f => f.active).sort((a, b) => a.compliance.compliancePct - b.compliance.compliancePct).slice(0, 7);
    if (sorted.length === 0) return '<div class="text-muted text-small">אין מתקנים לתצוגה</div>';
    return `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>שם מתקן</th>
              <th>פיקוד / יחידה</th>
              <th>סטטוס</th>
              <th>סד״כ</th>
              <th>עמידה בתקן</th>
              <th>חוסרים</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(f => `
              <tr class="clickable" data-go="/facilities/${f.id}">
                <td><strong>${escapeHtml(f.name)}</strong></td>
                <td class="text-small text-muted">${escapeHtml(f.command)} · ${escapeHtml(f.division)}</td>
                <td>${StatusPill.render(f.status)}</td>
                <td class="col-num">${fmtNumber(f.maxCapacity)}</td>
                <td>${ComplianceCell.render(f.compliance.compliancePct)}</td>
                <td class="col-num"><strong style="color:var(--color-danger);">${fmtNumber(f.compliance.totalGap)}</strong></td>
                <td class="col-actions"><span class="btn btn-sm btn-ghost">${Icons.eye}<span>פתח</span></span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  scopeLabel(user) {
    if (!user) return '';
    const s = user.scope || {};
    const parts = [s.command, s.division, s.brigade, s.battalion].filter(Boolean);
    if (parts.length === 0) return 'גישה ארגונית מלאה';
    return 'גישה: ' + parts.join(' / ');
  }

  afterRender() {
    this.on('[data-go]', 'click', (e, el) => {
      router.go(el.dataset.go);
    });
  }
}
