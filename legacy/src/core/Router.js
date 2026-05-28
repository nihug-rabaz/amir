import { bus } from './EventBus.js';

export class Router {
  constructor() {
    this.routes = [];
    this.notFound = null;
    this.current = null;
  }

  on(pattern, handler) {
    this.routes.push({ pattern, handler });
    return this;
  }

  setNotFound(handler) { this.notFound = handler; return this; }

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  go(path) {
    if (location.hash === '#' + path) this.resolve();
    else location.hash = path;
  }

  resolve() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const [pathOnly, queryStr = ''] = hash.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryStr).entries());
    for (const route of this.routes) {
      const params = this.match(route.pattern, pathOnly);
      if (params) {
        this.current = { path: hash, pathOnly, pattern: route.pattern, params, query };
        bus.emit('route:change', this.current);
        route.handler({ ...params, query });
        return;
      }
    }
    if (this.notFound) this.notFound();
  }

  match(pattern, path) {
    const patParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (patParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patParts.length; i++) {
      if (patParts[i].startsWith(':')) {
        params[patParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }
}

export const router = new Router();
