import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';

export class DataTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sortKey: props.defaultSort?.key || null,
      sortDir: props.defaultSort?.dir || 'asc',
      search: '',
      filters: { ...(props.defaultFilters || {}) },
      page: 1,
    };
  }

  get pageSize() { return this.props.pageSize || 25; }

  filteredRows() {
    let rows = this.props.rows || [];
    const q = (this.state.search || '').trim();
    if (q && this.props.searchableFields) {
      const qLower = q.toLowerCase();
      rows = rows.filter(r =>
        this.props.searchableFields.some(k => String(r[k] ?? '').toLowerCase().includes(qLower))
      );
    }
    for (const f of (this.props.filters || [])) {
      const val = this.state.filters[f.key];
      if (val && val !== '__all__') rows = rows.filter(r => String(r[f.key]) === String(val));
    }
    if (this.state.sortKey) {
      const dir = this.state.sortDir === 'asc' ? 1 : -1;
      const k = this.state.sortKey;
      const col = (this.props.columns || []).find(c => c.key === k);
      rows = [...rows].sort((a, b) => {
        const va = col?.sortValue ? col.sortValue(a) : a[k];
        const vb = col?.sortValue ? col.sortValue(b) : b[k];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), 'he') * dir;
      });
    }
    return rows;
  }

  paginate(rows) {
    if (!this.props.paginate) return rows;
    const start = (this.state.page - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  totalPages(rows) {
    if (!this.props.paginate) return 1;
    return Math.max(1, Math.ceil(rows.length / this.pageSize));
  }

  render() {
    const allRows = this.filteredRows();
    const pageRows = this.paginate(allRows);
    const totalPages = this.totalPages(allRows);
    return html`
      <div class="table-wrap">
        ${this.renderToolbar()}
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                ${this.props.columns.map(col => `
                  <th data-sort-key="${col.key}" style="${col.width ? `width:${col.width};` : ''} ${col.center ? 'text-align:center;' : ''}">
                    ${escapeHtml(col.label)}
                    ${col.sortable !== false ? this.renderSortArrow(col.key) : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${pageRows.length === 0 ? `
                <tr class="row-empty">
                  <td colspan="${this.props.columns.length}">
                    <div class="empty-state">
                      <div class="empty-icon">⌕</div>
                      <h4>אין רשומות להצגה</h4>
                      <div>נסה לשנות סינון או חיפוש</div>
                    </div>
                  </td>
                </tr>
              ` : pageRows.map((row, idx) => this.renderRow(row, idx)).join('')}
            </tbody>
          </table>
        </div>
        ${this.props.paginate ? this.renderPager(allRows.length, totalPages) : ''}
      </div>
    `;
  }

  renderToolbar() {
    if (this.props.hideToolbar) return '';
    const filters = this.props.filters || [];
    const hasSearch = !!this.props.searchableFields;
    if (!hasSearch && filters.length === 0 && !this.props.toolbarExtra) return '';
    return `
      <div class="table-toolbar">
        ${hasSearch ? `
          <div class="table-search">
            ${Icons.search}
            <input type="search" placeholder="חיפוש..." data-table-search value="${escapeHtml(this.state.search)}" />
          </div>
        ` : ''}
        ${filters.map(f => `
          <div class="table-filter">
            <label>${escapeHtml(f.label)}:</label>
            <select data-table-filter="${f.key}">
              <option value="__all__">${escapeHtml(f.allLabel || 'הכל')}</option>
              ${f.options.map(o => `<option value="${escapeHtml(o.value)}" ${String(this.state.filters[f.key]) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
            </select>
          </div>
        `).join('')}
        <div style="flex:1;"></div>
        ${this.props.toolbarExtra || ''}
      </div>
    `;
  }

  renderRow(row, idx) {
    const clickable = !!this.props.onRowClick;
    return `
      <tr class="${clickable ? 'clickable' : ''} ${this.props.rowClass ? this.props.rowClass(row) : ''}" data-row-id="${escapeHtml(row.id ?? idx)}">
        ${this.props.columns.map(col => `
          <td class="${col.center ? 'col-num' : ''} ${col.cellClass || ''}">${col.render ? col.render(row) : escapeHtml(row[col.key] ?? '—')}</td>
        `).join('')}
      </tr>
    `;
  }

  renderSortArrow(key) {
    if (this.state.sortKey !== key) return '<span class="sort-arrow">↕</span>';
    return `<span class="sort-arrow">${this.state.sortDir === 'asc' ? '↑' : '↓'}</span>`;
  }

  renderPager(totalRows, totalPages) {
    return `
      <div class="table-toolbar" style="justify-content: space-between;">
        <div class="text-small text-muted">סה״כ ${totalRows} רשומות · עמוד ${this.state.page} מתוך ${totalPages}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-ghost" data-pager="prev" ${this.state.page <= 1 ? 'disabled' : ''}>‹ הקודם</button>
          <button class="btn btn-sm btn-ghost" data-pager="next" ${this.state.page >= totalPages ? 'disabled' : ''}>הבא ›</button>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.on('[data-sort-key]', 'click', (e, el) => {
      const key = el.dataset.sortKey;
      const col = (this.props.columns || []).find(c => c.key === key);
      if (col?.sortable === false) return;
      if (this.state.sortKey === key) this.setState({ sortDir: this.state.sortDir === 'asc' ? 'desc' : 'asc' });
      else this.setState({ sortKey: key, sortDir: 'asc' });
    });
    this.on('[data-table-search]', 'input', (e) => {
      this.setState({ search: e.target.value, page: 1 });
    });
    this.on('[data-table-filter]', 'change', (e, el) => {
      const k = el.dataset.tableFilter;
      this.setState({ filters: { ...this.state.filters, [k]: el.value }, page: 1 });
    });
    this.on('[data-row-id]', 'click', (e, el) => {
      if (e.target.closest('button, a, input, select')) return;
      const id = el.dataset.rowId;
      const row = (this.props.rows || []).find(r => String(r.id) === String(id));
      if (row && this.props.onRowClick) this.props.onRowClick(row);
    });
    this.on('[data-pager]', 'click', (e, el) => {
      const dir = el.dataset.pager;
      if (dir === 'next') this.setState({ page: this.state.page + 1 });
      else if (dir === 'prev') this.setState({ page: Math.max(1, this.state.page - 1) });
    });
  }
}
