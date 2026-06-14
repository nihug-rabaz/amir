import { Component, html, escapeHtml } from '../core/Component.js';
import { userService } from '../services/UserService.js';
import { ROLE_LABELS } from '../data/seed.js';
import { store } from '../core/Store.js';
import { bus } from '../core/EventBus.js';
import { Toast } from '../components/Toast.js';

export class LoginView extends Component {
  render() {
    const users = userService.active();
    return html`
      <div class="login-card">
        <div class="login-mark">אמ</div>
        <h1>אמי״ר 2.0</h1>
        <div class="login-sub">ארגון מרחב ייעודי רבנותי · התחברות מאובטחת</div>

        <div class="form-group" style="margin-top:24px;">
          <label>ת״ז</label>
          <input class="form-control" data-login-id placeholder="לדוגמה: 1101234" autocomplete="off" />
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>אמצעי הזדהות</label>
          <select class="form-control" data-login-method>
            <option value="myidf">MyIDF</option>
            <option value="card">תעודת זהות</option>
          </select>
        </div>

        <button class="btn btn-accent w-full" style="margin-top:18px; justify-content:center;" data-login>
          התחבר למערכת
        </button>

        <div class="login-quick">
          <h4>כניסה מהירה (הדגמה)</h4>
          ${users.map(u => `
            <button data-quick-login="${escapeHtml(u.id)}">
              <span><strong>${escapeHtml(u.name)}</strong> · ${escapeHtml(ROLE_LABELS[u.role])}</span>
              <small>${escapeHtml(u.personalId)}</small>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  afterRender() {
    this.on('[data-quick-login]', 'click', (e, el) => {
      const user = userService.find(el.dataset.quickLogin);
      this.signIn(user);
    });
    this.on('[data-login]', 'click', () => {
      const id = this.q('[data-login-id]').value.trim();
      if (!id) return Toast.danger('שגיאת התחברות', 'יש להזין ת״ז');
      const user = userService.all().find(u => u.personalId === id);
      if (!user) return Toast.danger('משתמש לא נמצא', 'בחר מהרשימה למטה לצורך הדגמה');
      this.signIn(user);
    });
  }

  signIn(user) {
    if (!user) return;
    const card = this.q('.login-card');
    if (card) {
      card.style.transition = 'opacity 220ms ease, transform 220ms ease';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px)';
    }
    setTimeout(() => {
      store.set({ currentUser: user });
      bus.emit('auth:login', user);
      Toast.success(`ברוך הבא, ${user.name}`, ROLE_LABELS[user.role]);
    }, 220);
  }
}
