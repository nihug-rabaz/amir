import { Component, html } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { router } from '../core/Router.js';
import { bus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { PermissionService } from '../services/PermissionService.js';

export class Sidebar extends Component {
  constructor() {
    super();
    this.unsub = bus.on('route:change', () => this.update());
    this.unsubStore = store.subscribe(() => this.update());
  }

  navItems() {
    return [
      { id: 'home', path: '/', label: 'בית', icon: Icons.home },
      { id: 'dashboard', path: '/dashboard', label: 'דשבורד ניהולי', icon: Icons.chart },
      { id: 'facilities', path: '/facilities', label: 'מתקנים', icon: Icons.building },
      { id: 'inventory', path: '/inventory', label: 'עדכון מלאי', icon: Icons.boxes },
      { id: 'gaps', path: '/gaps', label: 'פערים וחוסרים', icon: Icons.alert },
      { id: 'standards', path: '/standards', label: 'תקנים (חוקה)', icon: Icons.scale },
      { id: 'users', path: '/users', label: 'משתמשים והרשאות', icon: Icons.users, allow: ['admin'] },
      { id: 'audit', path: '/audit', label: 'יומן שינויים', icon: Icons.history },
    ];
  }

  render() {
    const current = router.current?.pathOnly || router.current?.path || '/';
    const user = store.get('currentUser');
    const items = this.navItems().filter(i => !i.allow || i.allow.includes(user?.role));
    return html`
      <div class="sidebar-brand">
        <div class="sidebar-brand-mark">אמ</div>
        <div>
          <div class="sidebar-brand-title">אמי״ר 2.0</div>
          <div class="sidebar-brand-sub">ארגון מרחב ייעודי רבנותי</div>
        </div>
      </div>
      <div class="sidebar-section-label">תפריט ראשי</div>
      <nav class="sidebar-nav">
        ${items.map(item => `
          <a class="sidebar-link ${this.isActive(current, item.path) ? 'active' : ''}" data-path="${item.path}">
            ${item.icon}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div>גרסה 2.0.0 · אבטיפוס</div>
        <div style="opacity:0.7; margin-top:4px;">© הרבנות הצבאית</div>
      </div>
    `;
  }

  isActive(current, path) {
    if (path === '/') return current === '/' || current === '';
    return current.startsWith(path);
  }

  afterRender() {
    this.on('[data-path]', 'click', (e, el) => {
      router.go(el.dataset.path);
    });
  }
}
