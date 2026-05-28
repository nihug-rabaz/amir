import { escapeHtml } from '../core/Component.js';
import { HierarchyService } from '../data/hierarchy.js';

export class StatusPill {
  static render(status) {
    const cls = HierarchyService.statusColor(status);
    return `<span class="status-pill ${cls}"><span class="dot"></span>${escapeHtml(status || '—')}</span>`;
  }
}

export class ComplianceCell {
  static render(pct) {
    const cls = pct >= 90 ? '' : (pct >= 70 ? 'warning' : 'danger');
    return `
      <div class="compliance-cell">
        <div class="compliance-bar ${cls}"><span style="width:${Math.min(100, pct)}%"></span></div>
        <span class="compliance-label">${pct}%</span>
      </div>
    `;
  }
}

export class GapStatusBadge {
  static render(status) {
    const map = {
      'ok': { cls: 'badge-success', label: 'תקין' },
      'missing': { cls: 'badge-danger', label: 'חסר' },
      'surplus': { cls: 'badge-info', label: 'עודף' },
      'not-relevant': { cls: 'badge-neutral', label: 'לא רלוונטי' },
    };
    const m = map[status] || { cls: 'badge-neutral', label: '—' };
    return `<span class="badge ${m.cls}"><span class="dot"></span>${escapeHtml(m.label)}</span>`;
  }
}
