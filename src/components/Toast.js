import { Icons } from '../core/Icons.js';
import { escapeHtml } from '../core/Component.js';

export class Toast {
  static show({ title, message = '', kind = 'info', duration = 3500 }) {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `
      ${Icons.check}
      <div>
        <strong>${escapeHtml(title)}</strong>
        ${message ? `<small>${escapeHtml(message)}</small>` : ''}
      </div>
    `;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  static success(title, message) { Toast.show({ title, message, kind: 'success' }); }
  static warning(title, message) { Toast.show({ title, message, kind: 'warning' }); }
  static danger(title, message)  { Toast.show({ title, message, kind: 'danger' }); }
}
