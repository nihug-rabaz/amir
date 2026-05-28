import { Icons } from '../core/Icons.js';
import { escapeHtml } from '../core/Component.js';

export class Modal {
  constructor({ title, body, footer = null, wide = false, onClose = null }) {
    this.title = title;
    this.body = body;
    this.footer = footer;
    this.wide = wide;
    this.onClose = onClose;
    this.el = null;
  }

  static open(opts) {
    const m = new Modal(opts);
    m.show();
    return m;
  }

  static confirm({ title, message, confirmText = 'אישור', cancelText = 'ביטול', danger = false }) {
    return new Promise((resolve) => {
      const m = new Modal({
        title,
        body: `<div style="font-size:14px; color:var(--color-text); line-height:1.6;">${escapeHtml(message)}</div>`,
        footer: `
          <button class="btn btn-ghost" data-modal-cancel>${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-confirm>${escapeHtml(confirmText)}</button>
        `,
        onClose: () => resolve(false),
      });
      m.show();
      m.el.querySelector('[data-modal-confirm]').addEventListener('click', () => {
        m.close();
        resolve(true);
      });
      m.el.querySelector('[data-modal-cancel]').addEventListener('click', () => {
        m.close();
        resolve(false);
      });
    });
  }

  show() {
    const host = document.getElementById('modal-host');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal ${this.wide ? 'wide' : ''}" role="dialog">
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(this.title)}</h3>
          <button class="modal-close" data-modal-x aria-label="סגור">×</button>
        </div>
        <div class="modal-body">${typeof this.body === 'string' ? this.body : ''}</div>
        ${this.footer ? `<div class="modal-footer">${this.footer}</div>` : ''}
      </div>
    `;
    if (typeof this.body !== 'string') {
      const bodyEl = backdrop.querySelector('.modal-body');
      bodyEl.appendChild(this.body);
    }
    host.appendChild(backdrop);
    this.el = backdrop;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) this.close(); });
    backdrop.querySelector('[data-modal-x]').addEventListener('click', () => this.close());
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    if (this.onClose) this.onClose();
  }
}
