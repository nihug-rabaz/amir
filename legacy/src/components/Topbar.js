import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import { bus } from '../core/EventBus.js';
import { ROLE_LABELS } from '../data/seed.js';

export class Topbar extends Component {
  constructor() {
    super();
    this.unsub = bus.on('route:change', () => this.update());
    this.unsubStore = store.subscribe(() => this.update());
  }

  titleFor(path) {
    if (!path || path === '/') return { title: 'ברוכים הבאים לאמי״ר 2.0', sub: 'מערכת ניהול ציוד ותשתיות רבנותיות בצה״ל' };
    if (path.startsWith('/facilities/new')) return { title: 'הוספת מתקן חדש', sub: 'מילוי פרטי מתקן צבאי' };
    if (path.startsWith('/facilities/') && path.includes('/edit')) return { title: 'עריכת מתקן', sub: 'עדכון פרטי מתקן צבאי' };
    if (path.startsWith('/facilities/')) return { title: 'פרטי מתקן', sub: 'תצוגת מתקן ומלאי' };
    if (path === '/facilities') return { title: 'מתקנים', sub: 'רשימת מתקנים רבנותיים' };
    if (path === '/dashboard') return { title: 'דשבורד ניהולי', sub: 'תצוגה כוללת של מצב המרחב הרבנותי' };
    if (path === '/inventory') return { title: 'עדכון מלאי', sub: 'הזנת כמויות פריטים והשוואה לתקן' };
    if (path === '/gaps') return { title: 'פערים וחוסרים', sub: 'תצוגת כל הפערים מול תקן רבצ״ר' };
    if (path === '/standards') return { title: 'תקנים (חוקה)', sub: 'ניהול תקנים לפי הוראות רבצ״ר' };
    if (path === '/users') return { title: 'משתמשים והרשאות', sub: 'ניהול משתמשי המערכת' };
    if (path === '/audit') return { title: 'יומן שינויים', sub: 'תיעוד פעולות משתמשים' };
    return { title: 'אמי״ר 2.0', sub: '' };
  }

  render() {
    const t = this.titleFor(router.current?.pathOnly || router.current?.path || '/');
    const user = store.get('currentUser');
    const initials = (user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('');
    return html`
      <div>
        <div class="topbar-title">${escapeHtml(t.title)}</div>
        <div class="topbar-sub">${escapeHtml(t.sub)}</div>
      </div>
      <div class="topbar-spacer"></div>
      <div class="topbar-search">
        ${Icons.search}
        <input type="search" placeholder="חיפוש מתקנים, יחידות, פריטים..." data-global-search value="${escapeHtml(store.get('search') || '')}" />
      </div>
      <div class="user-chip" data-logout>
        <div class="user-avatar">${escapeHtml(initials)}</div>
        <div class="user-meta">
          <strong>${escapeHtml(user?.name || 'אורח')}</strong>
          <span>${escapeHtml(ROLE_LABELS[user?.role] || '')}</span>
        </div>
        ${Icons.logout}
      </div>
    `;
  }

  afterRender() {
    this.on('[data-global-search]', 'input', (e) => {
      store.set({ search: e.target.value });
    });
    this.on('[data-logout]', 'click', () => {
      store.set({ currentUser: null });
      bus.emit('auth:logout');
    });
  }
}
