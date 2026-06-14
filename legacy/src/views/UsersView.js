import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { DataTable } from '../components/DataTable.js';
import { userService } from '../services/UserService.js';
import { ROLES, ROLE_LABELS } from '../data/seed.js';
import { COMMANDS, HierarchyService } from '../data/hierarchy.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { store } from '../core/Store.js';

export class UsersView extends Component {
  render() {
    const user = store.get('currentUser');
    if (user?.role !== ROLES.ADMIN) {
      return `<div class="card card-padded"><div class="empty-state"><div class="empty-icon">${Icons.shield}</div><h4>גישה מוגבלת</h4><div>רק מנהל מערכת רשאי לנהל משתמשים</div></div></div>`;
    }
    return html`
      <div class="page-header">
        <div>
          <h1 class="page-title">משתמשים והרשאות</h1>
          <div class="page-subtitle">ניהול משתמשים, תפקידים ויחידות משויכות</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" data-new>${Icons.plus}<span>הוספת משתמש</span></button>
        </div>
      </div>

      <div id="users-table"></div>
    `;
  }

  afterRender() {
    if (store.get('currentUser')?.role !== ROLES.ADMIN) return;
    const rows = userService.all().map(u => ({
      ...u,
      roleLabel: ROLE_LABELS[u.role],
      scopeLabel: [u.scope?.command, u.scope?.division, u.scope?.brigade, u.scope?.battalion].filter(Boolean).join(' / ') || 'מלא',
    }));

    const table = new DataTable({
      rows,
      searchableFields: ['name', 'personalId', 'roleLabel'],
      filters: [
        { key: 'role', label: 'תפקיד', options: Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
      ],
      columns: [
        { key: 'name', label: 'שם', render: r => `<strong>${escapeHtml(r.name)}</strong>` },
        { key: 'personalId', label: 'ת״ז' },
        { key: 'roleLabel', label: 'תפקיד' },
        { key: 'scopeLabel', label: 'תחום אחריות' },
        { key: 'active', label: 'סטטוס', render: r => r.active ? '<span class="badge badge-success">פעיל</span>' : '<span class="badge badge-neutral">לא פעיל</span>' },
        { key: 'actions', label: '', sortable: false, render: r => `<div style="text-align:left;"><button class="btn btn-sm btn-ghost" data-edit-user="${r.id}">${Icons.edit}</button> <button class="btn btn-sm btn-ghost" data-toggle-user="${r.id}">${r.active ? Icons.x : Icons.check}</button></div>` },
      ],
    });
    table.mount(this.q('#users-table'));

    this.on('[data-new]', 'click', () => this.openEditor(null));
    this.on('[data-edit-user]', 'click', (e, el) => this.openEditor(el.dataset.editUser));
    this.on('[data-toggle-user]', 'click', (e, el) => {
      const u = userService.find(el.dataset.toggleUser);
      if (!u) return;
      u.active = !u.active;
      userService.upsert(u);
      Toast.success('המשתמש עודכן', `${u.name} ${u.active ? 'הופעל' : 'נחסם'}`);
      this.update();
    });
  }

  openEditor(id) {
    const user = id ? userService.find(id) : { name: '', personalId: '', role: ROLES.FIELD_RABBI, scope: {}, active: true };
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group"><label>שם מלא <span class="req">*</span></label><input class="form-control" data-u-name value="${escapeHtml(user.name)}" /></div>
        <div class="form-group"><label>ת״ז <span class="req">*</span></label><input class="form-control" data-u-id value="${escapeHtml(user.personalId)}" /></div>
        <div class="form-group"><label>תפקיד</label>
          <select class="form-control" data-u-role>
            ${Object.entries(ROLE_LABELS).map(([v, l]) => `<option value="${v}" ${user.role === v ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>פיקוד (תחום אחריות)</label>
          <select class="form-control" data-u-cmd>
            <option value="">— ללא הגבלה —</option>
            ${COMMANDS.map(c => `<option value="${escapeHtml(c)}" ${user.scope?.command === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>אוגדה</label>
          <select class="form-control" data-u-div>
            <option value="">— ללא —</option>
            ${HierarchyService.divisionsFor(user.scope?.command).map(d => `<option value="${escapeHtml(d)}" ${user.scope?.division === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="display:flex; align-items:end;">
          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" data-u-active ${user.active ? 'checked' : ''} /> פעיל
          </label>
        </div>
      </div>
    `;
    Modal.open({
      title: id ? 'עריכת משתמש' : 'הוספת משתמש',
      body,
      footer: `<button class="btn btn-ghost" data-modal-cancel>ביטול</button><button class="btn btn-primary" data-modal-save>שמירה</button>`,
      onClose: () => {},
    });
    const modalEl = document.querySelector('.modal-backdrop:last-child');
    modalEl.querySelector('[data-modal-cancel]').addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('[data-modal-save]').addEventListener('click', () => {
      const name = body.querySelector('[data-u-name]').value.trim();
      const personalId = body.querySelector('[data-u-id]').value.trim();
      if (!name || !personalId) return Toast.danger('שגיאה', 'יש למלא שם ות״ז');
      const updated = {
        ...user,
        name, personalId,
        role: body.querySelector('[data-u-role]').value,
        scope: {
          command: body.querySelector('[data-u-cmd]').value || null,
          division: body.querySelector('[data-u-div]').value || null,
          brigade: null, battalion: null,
        },
        active: body.querySelector('[data-u-active]').checked,
      };
      userService.upsert(updated);
      Toast.success('המשתמש נשמר', name);
      modalEl.remove();
      this.update();
    });
  }
}
