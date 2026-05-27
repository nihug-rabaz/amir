import { escapeHtml } from '../core/Component.js';

export class KpiCard {
  static render({ label, value, icon, tone = 'info', delta = null }) {
    return `
      <div class="kpi">
        <div class="kpi-icon ${tone}">${icon || ''}</div>
        <div class="kpi-content">
          <span class="kpi-label">${escapeHtml(label)}</span>
          <span class="kpi-value">${escapeHtml(String(value))}</span>
          ${delta != null ? `<span class="kpi-delta">${escapeHtml(delta)}</span>` : ''}
        </div>
      </div>
    `;
  }
}
