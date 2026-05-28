import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { facilityService } from '../services/FacilityService.js';
import { standardsService } from '../services/StandardsService.js';
import { PermissionService } from '../services/PermissionService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { fmtNumber } from '../core/utils.js';
import { ITEM_CATEGORIES } from '../data/items.js';
import { COMMANDS } from '../data/hierarchy.js';
import { KpiCard } from '../components/KpiCard.js';
import { ComplianceCell } from '../components/StatusPill.js';

export class DashboardView extends Component {
  constructor() {
    super();
    this.charts = [];
  }

  destroy() {
    this.charts.forEach(c => { try { c.destroy(); } catch (e) {} });
    this.charts = [];
    super.destroy();
  }

  render() {
    const user = store.get('currentUser');
    const facilities = PermissionService.filterFacilities(user, facilityService.all());
    const sum = facilityService.summary(facilities);
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">דשבורד ניהולי</h1>
          <div class="page-subtitle">תצוגה מקיפה של מצב המרחב הרבנותי</div>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        ${KpiCard.render({ label: 'סה״כ מתקנים', value: fmtNumber(sum.total), icon: Icons.building, tone: 'info' })}
        ${KpiCard.render({ label: 'תקינים - בשימוש', value: fmtNumber(sum.active), icon: Icons.check, tone: 'success' })}
        ${KpiCard.render({ label: 'בשיפוץ', value: fmtNumber(sum.reno), icon: Icons.cog, tone: 'warning' })}
        ${KpiCard.render({ label: 'לא בשימוש', value: fmtNumber(sum.inactive), icon: Icons.x, tone: 'neutral' })}
      </div>
      <div class="grid grid-4 mb-4">
        ${KpiCard.render({ label: 'עמידה ממוצעת', value: sum.avgCompliance + '%', icon: Icons.scale, tone: 'success' })}
        ${KpiCard.render({ label: 'מתקנים בתקן (90%+)', value: fmtNumber(sum.compliant), icon: Icons.star, tone: 'accent' })}
        ${KpiCard.render({ label: 'פריטים חסרים', value: fmtNumber(sum.totalGaps), icon: Icons.alert, tone: 'danger' })}
        ${KpiCard.render({ label: 'פריטים בעודף', value: fmtNumber(sum.totalSurplus), icon: Icons.boxes, tone: 'info' })}
      </div>

      <div class="grid grid-2 mb-4">
        <div class="chart-card">
          <h3>סטטוס מתקנים</h3>
          <div class="chart-canvas"><canvas data-chart="status"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>אחוז עמידה בתקן לפי פיקוד</h3>
          <div class="chart-canvas"><canvas data-chart="compliance"></canvas></div>
        </div>
      </div>

      <div class="grid grid-2 mb-4">
        <div class="chart-card">
          <h3>מספר חוסרים לפי פיקוד</h3>
          <div class="chart-canvas"><canvas data-chart="gaps"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>פילוח פערים לפי קטגוריית פריט</h3>
          <div class="chart-canvas"><canvas data-chart="categories"></canvas></div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card card-padded">
          <h3 class="card-title">${Icons.alert}עשרת המתקנים עם הכי הרבה חוסרים</h3>
          ${this.renderTopFacilities(sum.list)}
        </div>
        <div class="card card-padded">
          <h3 class="card-title">${Icons.scroll}עשרת הפריטים החסרים ביותר</h3>
          ${this.renderTopItems(facilities)}
        </div>
      </div>
    `;
  }

  renderTopFacilities(list) {
    const top = [...list].filter(f => f.compliance.totalGap > 0).sort((a, b) => b.compliance.totalGap - a.compliance.totalGap).slice(0, 10);
    if (top.length === 0) return '<div class="empty-state"><h4>אין חוסרים</h4><div>כל המתקנים עומדים בתקן</div></div>';
    return `<table class="data-table"><tbody>${top.map(f => `
      <tr class="clickable" data-go="/facilities/${f.id}">
        <td><strong>${escapeHtml(f.name)}</strong><div class="text-muted text-small">${escapeHtml(f.command)} · ${escapeHtml(f.division)}</div></td>
        <td style="width:160px;">${ComplianceCell.render(f.compliance.compliancePct)}</td>
        <td class="col-num" style="width:70px;"><strong style="color:var(--color-danger);">${fmtNumber(f.compliance.totalGap)}</strong></td>
      </tr>
    `).join('')}</tbody></table>`;
  }

  renderTopItems(facilities) {
    const acc = {};
    for (const f of facilities) {
      const cmp = standardsService.compareFacility(f);
      for (const r of cmp.rows) {
        if (r.gap > 0) acc[r.name] = (acc[r.name] || 0) + r.gap;
      }
    }
    const items = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (items.length === 0) return '<div class="empty-state"><h4>אין פריטים חסרים</h4></div>';
    const max = items[0][1];
    return `<div class="list-stack">${items.map(([name, count]) => `
      <div>
        <div class="progress-label"><span>${escapeHtml(name)}</span><strong>${fmtNumber(count)}</strong></div>
        <div class="progress danger"><div class="progress-bar" style="width:${(count / max) * 100}%"></div></div>
      </div>
    `).join('')}</div>`;
  }

  afterRender() {
    this.on('[data-go]', 'click', (e, el) => router.go(el.dataset.go));
    setTimeout(() => this.renderCharts(), 30);
  }

  renderCharts() {
    if (typeof Chart === 'undefined') { setTimeout(() => this.renderCharts(), 200); return; }
    Chart.defaults.font.family = 'Heebo, Rubik, system-ui';
    Chart.defaults.color = '#64748b';

    const user = store.get('currentUser');
    const facilities = PermissionService.filterFacilities(user, facilityService.all());

    const statusCounts = facilities.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {});
    this.mountChart('status', 'doughnut', {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#16a34a', '#ea7c1d', '#94a3b8', '#2563eb', '#7c3aed', '#cbd5e1'],
      }],
    }, {
      plugins: { legend: { position: 'bottom', rtl: true, labels: { padding: 14, usePointStyle: true } } },
      maintainAspectRatio: false,
    });

    const byCommand = COMMANDS.map(cmd => {
      const cmdFacs = facilities.filter(f => f.command === cmd);
      if (cmdFacs.length === 0) return null;
      const enriched = cmdFacs.map(f => facilityService.enriched(f));
      return {
        command: cmd,
        compliance: Math.round(enriched.reduce((s, f) => s + f.compliance.compliancePct, 0) / enriched.length),
        gaps: enriched.reduce((s, f) => s + f.compliance.totalGap, 0),
      };
    }).filter(Boolean);

    this.mountChart('compliance', 'bar', {
      labels: byCommand.map(x => x.command),
      datasets: [{ label: 'אחוז עמידה', data: byCommand.map(x => x.compliance), backgroundColor: '#1f4d7a' }],
    }, {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, max: 100 } },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false,
    });

    this.mountChart('gaps', 'bar', {
      labels: byCommand.map(x => x.command),
      datasets: [{ label: 'חוסרים', data: byCommand.map(x => x.gaps), backgroundColor: '#c53030' }],
    }, {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false,
    });

    const byCategory = {};
    for (const f of facilities) {
      const cmp = standardsService.compareFacility(f);
      for (const r of cmp.rows) {
        if (r.gap > 0) {
          const lbl = ITEM_CATEGORIES[r.category] || r.category;
          byCategory[lbl] = (byCategory[lbl] || 0) + r.gap;
        }
      }
    }
    this.mountChart('categories', 'pie', {
      labels: Object.keys(byCategory),
      datasets: [{
        data: Object.values(byCategory),
        backgroundColor: ['#0f2a44', '#1f4d7a', '#d4af37', '#4d6b3c', '#ea7c1d', '#c53030', '#2563eb', '#7c3aed'],
      }],
    }, {
      plugins: { legend: { position: 'bottom', rtl: true } },
      maintainAspectRatio: false,
    });
  }

  mountChart(name, type, data, options = {}) {
    const canvas = this.q(`[data-chart="${name}"]`);
    if (!canvas) return;
    const c = new Chart(canvas, { type, data, options });
    this.charts.push(c);
  }
}
