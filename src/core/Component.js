let _cid = 0;

export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.host = null;
    this.cid = ++_cid;
    this._handlers = [];
    this._children = new Set();
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    if (this.host) this.update();
  }

  mount(host) {
    this.host = host;
    this.host.innerHTML = '';
    this.update();
    return this;
  }

  update() {
    this.destroyChildren();
    this.removeHandlers();
    this.host.innerHTML = this.render();
    this.afterRender();
  }

  removeHandlers() {
    if (!this.host) return;
    this._handlers.forEach(({ event, fn }) => { try { this.host.removeEventListener(event, fn); } catch (e) {} });
    this._handlers = [];
  }

  registerChild(c) { this._children.add(c); return c; }

  destroyChildren() {
    for (const c of this._children) { try { c.destroy(); } catch (e) {} }
    this._children.clear();
  }

  on(selector, event, handler) {
    if (!this.host) return;
    const fn = (e) => {
      const target = e.target.closest(selector);
      if (target && this.host.contains(target)) handler(e, target);
    };
    this.host.addEventListener(event, fn);
    this._handlers.push({ event, fn });
  }

  q(sel) { return this.host?.querySelector(sel); }
  qa(sel) { return Array.from(this.host?.querySelectorAll(sel) || []); }

  afterRender() {}
  render() { return ''; }

  destroy() {
    this.removeHandlers();
    this.destroyChildren();
    if (this.host) this.host.innerHTML = '';
  }
}

export const html = (strings, ...values) => {
  let out = '';
  strings.forEach((s, i) => { out += s + (values[i] == null ? '' : values[i]); });
  return out;
};

export const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
