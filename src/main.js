import { router } from './core/Router.js';
import { store } from './core/Store.js';
import { bus } from './core/EventBus.js';
import { Sidebar } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';
import { LoginView } from './views/LoginView.js';
import { HomeView } from './views/HomeView.js';
import { FacilitiesView } from './views/FacilitiesView.js';
import { FacilityFormView } from './views/FacilityFormView.js';
import { FacilityDetailView } from './views/FacilityDetailView.js';
import { InventoryView } from './views/InventoryView.js';
import { GapsView } from './views/GapsView.js';
import { StandardsView } from './views/StandardsView.js';
import { UsersView } from './views/UsersView.js';
import { DashboardView } from './views/DashboardView.js';
import { AuditView } from './views/AuditView.js';
import { userService } from './services/UserService.js';

class AmirApp {
  constructor() {
    this.sidebar = null;
    this.topbar = null;
    this.currentView = null;
  }

  start() {
    this.restoreSession();
    bus.on('auth:login', () => this.showApp());
    bus.on('auth:logout', () => this.showLogin());
    this.bindRoutes();

    if (store.get('currentUser')) this.showApp();
    else this.showLogin();
  }

  restoreSession() {
    const raw = localStorage.getItem('amir2:session');
    if (!raw) return;
    try {
      const { userId } = JSON.parse(raw);
      const user = userService.find(userId);
      if (user) store.set({ currentUser: user });
    } catch (e) {}
    store.subscribe((s) => {
      if (s.currentUser) localStorage.setItem('amir2:session', JSON.stringify({ userId: s.currentUser.id }));
      else localStorage.removeItem('amir2:session');
    });
  }

  showLogin() {
    document.getElementById('app-shell').hidden = true;
    const loginEl = document.getElementById('login-screen');
    loginEl.hidden = false;
    const loginView = new LoginView();
    loginView.mount(loginEl);
  }

  showApp() {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-shell').hidden = false;
    this.sidebar = new Sidebar();
    this.sidebar.mount(document.getElementById('sidebar'));
    this.topbar = new Topbar();
    this.topbar.mount(document.getElementById('topbar'));
    router.start();
  }

  mountView(ViewClass, props = {}) {
    if (this.currentView) {
      try { this.currentView.destroy(); } catch (e) {}
    }
    const host = document.getElementById('view');
    this.currentView = new ViewClass(props);
    this.currentView.mount(host);
    window.scrollTo(0, 0);
  }

  bindRoutes() {
    router
      .on('/', () => this.mountView(HomeView))
      .on('/dashboard', () => this.mountView(DashboardView))
      .on('/facilities', () => this.mountView(FacilitiesView))
      .on('/facilities/new', () => this.mountView(FacilityFormView))
      .on('/facilities/:id', ({ id }) => this.mountView(FacilityDetailView, { id }))
      .on('/facilities/:id/edit', ({ id }) => this.mountView(FacilityFormView, { id }))
      .on('/inventory', ({ query }) => this.mountView(InventoryView, { facilityId: query?.facility || null }))
      .on('/gaps', () => this.mountView(GapsView))
      .on('/standards', () => this.mountView(StandardsView))
      .on('/users', () => this.mountView(UsersView))
      .on('/audit', () => this.mountView(AuditView))
      .setNotFound(() => this.mountView(HomeView));
  }
}

new AmirApp().start();
