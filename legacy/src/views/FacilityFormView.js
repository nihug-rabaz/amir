import { Component, html, escapeHtml } from '../core/Component.js';
import { Icons } from '../core/Icons.js';
import { facilityService } from '../services/FacilityService.js';
import { standardsService } from '../services/StandardsService.js';
import { store } from '../core/Store.js';
import { router } from '../core/Router.js';
import {
  COMMANDS, CAMP_TYPES, FACILITY_STATUS, PROJECT_TYPES,
  HierarchyService,
} from '../data/hierarchy.js';
import { INVENTORY_ITEMS, ITEM_CATEGORIES } from '../data/items.js';
import { Toast } from '../components/Toast.js';

export class FacilityFormView extends Component {
  constructor(props) {
    super(props);
    const existing = props.id ? facilityService.find(props.id) : null;
    this.state = {
      activeTab: 'details',
      form: existing ? structuredClone(existing) : this.emptyForm(),
      errors: {},
      isEdit: !!existing,
    };
  }

  emptyForm() {
    return {
      name: '', command: '', division: '', brigade: '', battalion: '',
      campType: '', status: '', project: 'שגרה',
      maxCapacity: 0, mealCapacity: 0,
      notes: '',
      active: true,
      inventory: {},
      fields: {
        mainKitchen: '', stoveType: '', salon: false, macshRoom: false, lightTable: false, lightBox: false,
        flourMachine: false, riceMachine: false, riceMachineSize: '',
        warmCabinetWithDevice: 0, warmCabinetNoDevice: 0, heatingPlates: 0, plateSeparatorMilk: 0,
        plateCoverShabbat: false, galeyShabbat: false, pesachStore: false, kitchenettes: 0, kitchenNotes: '',
        eruv: '', sgEntryShape: '', rakemEruv: false, eruvPolesNeeded: 0, eruvNotes: '',
        waterPressurePump: false, shabbatAdaptation: false,
        sgShabbatDeviceNeeded: false, sgShabbatDevicesNeeded: 0, sgShabbatDevicesInstalled: 0,
        iceMachines: 0, iceMachineDevice: false, shabbatNotes: '',
        mezuzotResidentialNeeded: 0, mezuzotResidentialInstalled: 0,
        mezuzotOtherNeeded: 0, mezuzotOtherInstalled: 0, mezuzotNotes: '',
        synagogueExists: false, synagogueStatus: '', seatsMen: 0, seatsWomen: 0,
        separateEntranceWomen: false, hasNetilatHandwash: false, synagogueNotes: '',
      },
    };
  }

  tabs() {
    return [
      { id: 'details', label: 'פרטי מתקן' },
      { id: 'kitchen', label: 'מטבח וטרקלין' },
      { id: 'eruv', label: 'עירוב והתאמה לשבת' },
      { id: 'mezuzot', label: 'מזוזות' },
      { id: 'synagogue', label: 'בית כנסת' },
      { id: 'inventory', label: 'מלאי וציוד' },
    ];
  }

  render() {
    const t = this.tabs();
    const f = this.state.form;
    return html`
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <a data-go="/facilities">מתקנים</a>
            <span class="sep">›</span>
            <span>${this.state.isEdit ? 'עריכת מתקן' : 'הוספת מתקן'}</span>
          </div>
          <h1 class="page-title">${this.state.isEdit ? escapeHtml(f.name || 'עריכת מתקן') : 'הוספת מתקן חדש'}</h1>
          <div class="page-subtitle">מילוי פרטים מלאים על המתקן הרבנותי</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" data-cancel>${Icons.back}<span>חזרה</span></button>
          <button class="btn btn-primary" data-save>${Icons.check}<span>שמירה</span></button>
        </div>
      </div>

      <div class="tabs">
        ${t.map(tab => `<div class="tab ${this.state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">${escapeHtml(tab.label)}</div>`).join('')}
      </div>

      <div class="card card-padded">
        ${this.renderTab()}
      </div>
    `;
  }

  renderTab() {
    switch (this.state.activeTab) {
      case 'details': return this.renderDetails();
      case 'kitchen': return this.renderKitchen();
      case 'eruv': return this.renderEruv();
      case 'mezuzot': return this.renderMezuzot();
      case 'synagogue': return this.renderSynagogue();
      case 'inventory': return this.renderInventoryTab();
    }
    return '';
  }

  renderDetails() {
    const f = this.state.form;
    const errors = this.state.errors;
    const tier = standardsService.tierFor(f.maxCapacity || 0);
    return `
      <div class="form-grid">
        ${this.input('שם המתקן', 'name', f.name, true, errors.name)}
        ${this.select('פיקוד', 'command', f.command, COMMANDS, true, errors.command)}
        ${this.select('אוגדה', 'division', f.division, HierarchyService.divisionsFor(f.command), false, null, !f.command)}
        ${this.select('חטיבה', 'brigade', f.brigade, HierarchyService.brigadesFor(f.division), false, null, !f.division)}
        ${this.select('גדוד', 'battalion', f.battalion, HierarchyService.battalionsFor(f.brigade), false, null, !f.brigade)}
        ${this.select('סוג מחנה', 'campType', f.campType, CAMP_TYPES, true, errors.campType)}
        ${this.select('סטאטוס המתקן', 'status', f.status, FACILITY_STATUS, true, errors.status)}
        ${this.select('פרויקט הקמה / שיפוץ', 'project', f.project, PROJECT_TYPES)}
        ${this.input('סד״כ מקסימלי', 'maxCapacity', f.maxCapacity, false, null, 'number')}
        ${this.input('סד״כ מתכלכלים בהתאם למזון', 'mealCapacity', f.mealCapacity, false, null, 'number')}
      </div>

      <div class="card card-section" style="background: var(--color-info-soft); border-color: rgba(37,99,235,0.2); margin-top: 18px;">
        <div class="text-strong text-small" style="color: var(--color-info);">תקן מחושב לפי סד״כ:</div>
        <div class="text-strong" style="font-size: 18px; margin-top: 4px;">${escapeHtml(tier.label)}</div>
      </div>

      <div class="form-grid cols-1 mt-3">
        ${this.textarea('הערות פרטי המתקן', 'notes', f.notes)}
      </div>

      ${this.state.isEdit ? `
        <div class="checkbox-row mt-3">
          <input type="checkbox" id="active" ${f.active ? 'checked' : ''} data-field="active" />
          <label for="active">המתקן פעיל</label>
        </div>
      ` : ''}
    `;
  }

  renderKitchen() {
    const k = this.state.form.fields;
    return `
      <div class="form-grid">
        ${this.input('מטבח ראשי (מחמם/מבשל)', 'mainKitchen', k.mainKitchen, false, null, 'text', 'fields')}
        ${this.input('סוג כיריים במתקן', 'stoveType', k.stoveType, false, null, 'text', 'fields')}
        ${this.checkbox('טרקלין', 'salon', k.salon, 'fields')}
        ${this.checkbox('חדר מכ״ש', 'macshRoom', k.macshRoom, 'fields')}
        ${this.checkbox('שולחן אור', 'lightTable', k.lightTable, 'fields')}
        ${this.checkbox('תיבת אור', 'lightBox', k.lightBox, 'fields')}
        ${this.checkbox('מכונת קמח', 'flourMachine', k.flourMachine, 'fields')}
        ${this.checkbox('מכונת אורז', 'riceMachine', k.riceMachine, 'fields')}
        ${this.input('גודל מכונת אורז', 'riceMachineSize', k.riceMachineSize, false, null, 'text', 'fields')}
        ${this.input('ארון ח. עם התקן', 'warmCabinetWithDevice', k.warmCabinetWithDevice, false, null, 'number', 'fields')}
        ${this.input('ארון ח. בלי התקן', 'warmCabinetNoDevice', k.warmCabinetNoDevice, false, null, 'number', 'fields')}
        ${this.input('עגלות / משטחי חימום', 'heatingPlates', k.heatingPlates, false, null, 'number', 'fields')}
        ${this.input('מפריד פלטה חלבי', 'plateSeparatorMilk', k.plateSeparatorMilk, false, null, 'number', 'fields')}
        ${this.checkbox('כיסוי משטח חימום לשבת', 'plateCoverShabbat', k.plateCoverShabbat, 'fields')}
        ${this.checkbox('גלי שבת', 'galeyShabbat', k.galeyShabbat, 'fields')}
        ${this.checkbox('מחסן פסח', 'pesachStore', k.pesachStore, 'fields')}
        ${this.input('כמות מטבחונים', 'kitchenettes', k.kitchenettes, false, null, 'number', 'fields')}
      </div>
      <div class="form-grid cols-1 mt-3">
        ${this.textarea('הערות מטבח וטרקלין', 'kitchenNotes', k.kitchenNotes, 'fields')}
      </div>
    `;
  }

  renderEruv() {
    const k = this.state.form.fields;
    return `
      <div class="form-grid">
        ${this.input('עירוב המתקן', 'eruv', k.eruv, false, null, 'text', 'fields')}
        ${this.input('צורת הפתח (ש.ג)', 'sgEntryShape', k.sgEntryShape, false, null, 'text', 'fields')}
        ${this.checkbox('עירוב משטח רק״מ', 'rakemEruv', k.rakemEruv, 'fields')}
        ${this.input('עמודי עירוב נדרשים', 'eruvPolesNeeded', k.eruvPolesNeeded, false, null, 'number', 'fields')}
        ${this.checkbox('משאבה להגברת לחץ מים', 'waterPressurePump', k.waterPressurePump, 'fields')}
        ${this.checkbox('בוצעה התאמה לשבת', 'shabbatAdaptation', k.shabbatAdaptation, 'fields')}
        ${this.checkbox('נדרש התקן שבת לש״ג', 'sgShabbatDeviceNeeded', k.sgShabbatDeviceNeeded, 'fields')}
        ${this.input('כמות התקנים נדרשת', 'sgShabbatDevicesNeeded', k.sgShabbatDevicesNeeded, false, null, 'number', 'fields')}
        ${this.input('כמות התקנים מותקנת', 'sgShabbatDevicesInstalled', k.sgShabbatDevicesInstalled, false, null, 'number', 'fields')}
        ${this.input('מכונות קרח', 'iceMachines', k.iceMachines, false, null, 'number', 'fields')}
        ${this.checkbox('התקן מכונת קרח לשבת', 'iceMachineDevice', k.iceMachineDevice, 'fields')}
      </div>
      <div class="form-grid cols-1 mt-3">
        ${this.textarea('הערות עירובין', 'eruvNotes', k.eruvNotes, 'fields')}
        ${this.textarea('הערות התאמה לשבת', 'shabbatNotes', k.shabbatNotes, 'fields')}
      </div>
    `;
  }

  renderMezuzot() {
    const k = this.state.form.fields;
    return `
      <div class="form-grid">
        ${this.input('מזוזות נדרשות (חדרי מגורים)', 'mezuzotResidentialNeeded', k.mezuzotResidentialNeeded, false, null, 'number', 'fields')}
        ${this.input('מזוזות מותקנות (חדרי מגורים)', 'mezuzotResidentialInstalled', k.mezuzotResidentialInstalled, false, null, 'number', 'fields')}
        ${this.input('מזוזות נדרשות (שאר דלתות)', 'mezuzotOtherNeeded', k.mezuzotOtherNeeded, false, null, 'number', 'fields')}
        ${this.input('מזוזות מותקנות (שאר דלתות)', 'mezuzotOtherInstalled', k.mezuzotOtherInstalled, false, null, 'number', 'fields')}
      </div>
      <div class="form-grid cols-1 mt-3">
        ${this.textarea('הערות מזוזות', 'mezuzotNotes', k.mezuzotNotes, 'fields')}
      </div>
    `;
  }

  renderSynagogue() {
    const k = this.state.form.fields;
    return `
      <div class="form-grid">
        ${this.checkbox('קיים בית כנסת', 'synagogueExists', k.synagogueExists, 'fields')}
        ${this.input('סטאטוס בית כנסת', 'synagogueStatus', k.synagogueStatus, false, null, 'text', 'fields')}
        ${this.input('מקומות ישיבה - גברים', 'seatsMen', k.seatsMen, false, null, 'number', 'fields')}
        ${this.input('מקומות ישיבה - נשים', 'seatsWomen', k.seatsWomen, false, null, 'number', 'fields')}
        ${this.checkbox('דלת כניסה נפרדת לעזרת נשים', 'separateEntranceWomen', k.separateEntranceWomen, 'fields')}
        ${this.checkbox('כיור נטילת ידיים', 'hasNetilatHandwash', k.hasNetilatHandwash, 'fields')}
      </div>
      <div class="form-grid cols-1 mt-3">
        ${this.textarea('הערות בית כנסת', 'synagogueNotes', k.synagogueNotes, 'fields')}
      </div>
    `;
  }

  renderInventoryTab() {
    const inv = this.state.form.inventory || {};
    const grouped = INVENTORY_ITEMS.reduce((acc, it) => { (acc[it.category] ||= []).push(it); return acc; }, {});
    return `
      <div class="list-stack">
        ${Object.entries(grouped).map(([cat, items]) => `
          <div class="card" style="padding: 14px;">
            <h3 class="card-title">${escapeHtml(ITEM_CATEGORIES[cat] || cat)}</h3>
            <div class="form-grid">
              ${items.map(item => `
                <div class="form-group">
                  <label>${escapeHtml(item.name)} <span class="text-muted">(${escapeHtml(item.unit)})</span></label>
                  <input class="form-control" type="number" min="0" value="${escapeHtml(String(inv[item.id] ?? 0))}" data-inv="${escapeHtml(item.id)}" />
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  input(label, name, value, required = false, error = null, type = 'text', group = null) {
    return `
      <div class="form-group">
        <label>${escapeHtml(label)} ${required ? '<span class="req">*</span>' : ''}</label>
        <input class="form-control" type="${type}" value="${escapeHtml(String(value ?? ''))}" data-field="${escapeHtml(name)}" ${group ? `data-group="${escapeHtml(group)}"` : ''} />
        ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  select(label, name, value, options, required = false, error = null, disabled = false) {
    return `
      <div class="form-group">
        <label>${escapeHtml(label)} ${required ? '<span class="req">*</span>' : ''}</label>
        <select class="form-control" data-field="${escapeHtml(name)}" ${disabled ? 'disabled' : ''}>
          <option value="">— בחר —</option>
          ${options.map(o => `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
        </select>
        ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  textarea(label, name, value, group = null) {
    return `
      <div class="form-group">
        <label>${escapeHtml(label)}</label>
        <textarea class="form-control" rows="3" data-field="${escapeHtml(name)}" ${group ? `data-group="${escapeHtml(group)}"` : ''}>${escapeHtml(String(value ?? ''))}</textarea>
      </div>
    `;
  }

  checkbox(label, name, value, group = null) {
    return `
      <div class="checkbox-row">
        <input type="checkbox" id="cb-${escapeHtml(name)}" ${value ? 'checked' : ''} data-field="${escapeHtml(name)}" ${group ? `data-group="${escapeHtml(group)}"` : ''} />
        <label for="cb-${escapeHtml(name)}">${escapeHtml(label)}</label>
      </div>
    `;
  }

  afterRender() {
    this.on('[data-tab]', 'click', (e, el) => {
      this.commitDom();
      this.setState({ activeTab: el.dataset.tab });
    });
    this.on('[data-cancel]', 'click', () => router.go(this.state.isEdit ? `/facilities/${this.state.form.id}` : '/facilities'));
    this.on('[data-save]', 'click', () => this.save());
    this.on('[data-go]', 'click', (e, el) => router.go(el.dataset.go));
    this.on('[data-field]', 'change', () => this.commitDom());
    this.on('[data-field]', 'input', () => this.commitDom(true));
    this.on('[data-inv]', 'input', () => this.commitDom(true));

    this.on('[data-field="command"]', 'change', () => {
      this.state.form.division = '';
      this.state.form.brigade = '';
      this.state.form.battalion = '';
      this.update();
    });
    this.on('[data-field="division"]', 'change', () => {
      this.state.form.brigade = '';
      this.state.form.battalion = '';
      this.update();
    });
    this.on('[data-field="brigade"]', 'change', () => {
      this.state.form.battalion = '';
      this.update();
    });
    this.on('[data-field="maxCapacity"]', 'input', () => {
      this.update();
    });
  }

  commitDom(soft = false) {
    if (!this.host) return;
    this.qa('[data-field]').forEach((el) => {
      const name = el.dataset.field;
      const group = el.dataset.group;
      let val;
      if (el.type === 'checkbox') val = el.checked;
      else if (el.type === 'number') val = Number(el.value) || 0;
      else val = el.value;
      if (group === 'fields') this.state.form.fields[name] = val;
      else this.state.form[name] = val;
    });
    this.qa('[data-inv]').forEach((el) => {
      const id = el.dataset.inv;
      this.state.form.inventory[id] = Math.max(0, Number(el.value) || 0);
    });
  }

  validate() {
    const f = this.state.form;
    const errors = {};
    if (!f.name?.trim()) errors.name = 'שדה חובה';
    if (!f.command) errors.command = 'שדה חובה';
    if (!f.campType) errors.campType = 'שדה חובה';
    if (!f.status) errors.status = 'שדה חובה';
    if (f.maxCapacity < 0) errors.maxCapacity = 'חייב להיות מספר חיובי';
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  }

  save() {
    this.commitDom();
    if (!this.validate()) {
      Toast.danger('שמירה נכשלה', 'יש למלא את כל שדות החובה');
      this.setState({ activeTab: 'details' });
      return;
    }
    const actor = store.get('currentUser');
    if (this.state.isEdit) {
      const updated = facilityService.update(this.state.form.id, this.state.form, actor);
      Toast.success('המתקן עודכן בהצלחה', updated.name);
      router.go(`/facilities/${updated.id}`);
    } else {
      const created = facilityService.create(this.state.form, actor);
      Toast.success('המתקן נוצר בהצלחה', created.name);
      router.go(`/facilities/${created.id}`);
    }
  }
}
