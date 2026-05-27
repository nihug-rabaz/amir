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

class AmirApp {
  constructor() {
    this.sidebar = null;
    this.topbar = null;
    this.currentView = null;
    this.loginView = null;
    this.routerStarted = false;
  }

  start() {
    try { localStorage.removeItem('amir2:session'); } catch (e) {}
    bus.on('auth:login', () => this.showApp());
    bus.on('auth:logout', () => this.showLogin());
    this.bindRoutes();
    this.showLogin();
  }

  showLogin() {
    store.set({ currentUser: null });
    if (this.currentView) { try { this.currentView.destroy(); } catch (e) {} this.currentView = null; }
    if (this.sidebar) { try { this.sidebar.destroy(); } catch (e) {} this.sidebar = null; }
    if (this.topbar) { try { this.topbar.destroy(); } catch (e) {} this.topbar = null; }
    if (location.hash && location.hash !== '#/') {
      history.replaceState(null, '', location.pathname + location.search);
    }
    document.getElementById('app-shell').hidden = true;
    const loginEl = document.getElementById('login-screen');
    loginEl.hidden = false;
    if (this.loginView) { try { this.loginView.destroy(); } catch (e) {} }
    this.loginView = new LoginView();
    this.loginView.mount(loginEl);
  }

  showApp() {
    if (this.loginView) { try { this.loginView.destroy(); } catch (e) {} this.loginView = null; }
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-shell').hidden = false;
    this.sidebar = new Sidebar();
    this.sidebar.mount(document.getElementById('sidebar'));
    this.topbar = new Topbar();
    this.topbar.mount(document.getElementById('topbar'));
    if (!this.routerStarted) {
      router.start();
      this.routerStarted = true;
    } else {
      router.go('/');
    }
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
