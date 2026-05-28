import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { DataTable } from '../components/DataTable.js';
import { auditService } from '../services/AuditService.js';
import { fmtDateTime } from '../core/utils.js';

export class AuditView extends Component {
  render() {
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">יומן שינויים</h1>
          <div class="page-subtitle">תיעוד כל פעולות המשתמשים במערכת</div>
        </div>
      </div>
      <div id="audit-table"></div>
    `;
  }

  afterRender() {
    const rows = auditService.all();
    const table = new DataTable({
      rows,
      searchableFields: ['user', 'summary', 'action', 'entity'],
      filters: [
        { key: 'action', label: 'פעולה', options: [
          { value: 'create', label: 'יצירה' },
          { value: 'update', label: 'עדכון' },
          { value: 'delete', label: 'מחיקה' },
          { value: 'update-inventory', label: 'עדכון מלאי' },
        ]},
        { key: 'entity', label: 'ישות', options: [
          { value: 'facility', label: 'מתקן' },
          { value: 'user', label: 'משתמש' },
          { value: 'standards', label: 'תקנים' },
        ]},
      ],
      columns: [
        { key: 'timestamp', label: 'תאריך ושעה', render: r => fmtDateTime(r.timestamp), sortValue: r => new Date(r.timestamp).getTime() },
        { key: 'user', label: 'משתמש', render: r => `<strong>${escapeHtml(r.user)}</strong>` },
        { key: 'action', label: 'פעולה', render: r => `<span class="badge badge-info">${escapeHtml(r.action)}</span>` },
        { key: 'entity', label: 'ישות' },
        { key: 'summary', label: 'תיאור' },
      ],
      defaultSort: { key: 'timestamp', dir: 'desc' },
      paginate: true, pageSize: 20,
    });
    table.mount(this.q('#audit-table'));
  }
}
