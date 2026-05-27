import { bus } from './EventBus.js';

export class Store {
  constructor(initial = {}) {
    this.state = initial;
    this.subscribers = new Set();
  }

  get(key) { return key ? this.state[key] : this.state; }

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  replace(next) {
    this.state = next;
    this.notify();
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    this.subscribers.forEach((fn) => { try { fn(this.state); } catch (e) { console.error(e); } });
    bus.emit('store:change', this.state);
  }
}

export const store = new Store({
  currentUser: null,
  hierarchyExpanded: {},
  search: '',
});
