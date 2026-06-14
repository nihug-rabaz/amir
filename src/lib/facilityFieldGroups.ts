import type { FacilityFields } from './types';

export type FieldType = 'bool' | 'num' | 'text' | 'textarea';

export interface FieldDef {
  key: keyof FacilityFields;
  label: string;
  type: FieldType;
}

// Maps inventory category keys to the facility-field inputs they should expose for editing.
export const FIELD_GROUPS: Record<string, FieldDef[]> = {
  kitchen: [
    { key: 'mainKitchen', label: 'מטבח ראשי (מחמם/מבשל)', type: 'text' },
    { key: 'stoveType', label: 'סוג כיריים במתקן', type: 'text' },
    { key: 'salon', label: 'טרקלין', type: 'bool' },
    { key: 'macshRoom', label: 'חדר מכ״ש', type: 'bool' },
    { key: 'lightTable', label: 'שולחן אור', type: 'bool' },
    { key: 'lightBox', label: 'תיבת אור', type: 'bool' },
    { key: 'flourMachine', label: 'מכונת קמח', type: 'bool' },
    { key: 'riceMachine', label: 'מכונת אורז', type: 'bool' },
    { key: 'riceMachineSize', label: 'גודל מכונת אורז', type: 'text' },
    { key: 'warmCabinetWithDevice', label: 'ארון ח. עם התקן', type: 'num' },
    { key: 'warmCabinetNoDevice', label: 'ארון ח. בלי התקן', type: 'num' },
    { key: 'heatingPlates', label: 'עגלות / משטחי חימום', type: 'num' },
    { key: 'plateSeparatorMilk', label: 'מפריד פלטה חלבי', type: 'num' },
    { key: 'plateCoverShabbat', label: 'כיסוי משטח חימום לשבת', type: 'bool' },
    { key: 'galeyShabbat', label: 'גלי שבת', type: 'bool' },
    { key: 'pesachStore', label: 'מחסן פסח', type: 'bool' },
    { key: 'kitchenettes', label: 'כמות מטבחונים', type: 'num' },
    { key: 'kitchenNotes', label: 'הערות מטבח וטרקלין', type: 'textarea' },
  ],
  shabbat: [
    { key: 'eruv', label: 'עירוב המתקן', type: 'text' },
    { key: 'sgEntryShape', label: 'צורת הפתח (ש.ג)', type: 'text' },
    { key: 'rakemEruv', label: 'עירוב משטח רק״מ', type: 'bool' },
    { key: 'eruvPolesNeeded', label: 'עמודי עירוב נדרשים', type: 'num' },
    { key: 'waterPressurePump', label: 'משאבה להגברת לחץ מים', type: 'bool' },
    { key: 'shabbatAdaptation', label: 'בוצעה התאמה לשבת', type: 'bool' },
    { key: 'sgShabbatDeviceNeeded', label: 'נדרש התקן שבת לש״ג', type: 'bool' },
    { key: 'sgShabbatDevicesNeeded', label: 'כמות התקנים נדרשת', type: 'num' },
    { key: 'sgShabbatDevicesInstalled', label: 'כמות התקנים מותקנת', type: 'num' },
    { key: 'iceMachines', label: 'מכונות קרח', type: 'num' },
    { key: 'iceMachineDevice', label: 'התקן מכונת קרח לשבת', type: 'bool' },
    { key: 'eruvNotes', label: 'הערות עירובין', type: 'textarea' },
    { key: 'shabbatNotes', label: 'הערות התאמה לשבת', type: 'textarea' },
  ],
  mezuzah: [
    { key: 'mezuzotResidentialNeeded', label: 'מזוזות נדרשות (חדרי מגורים)', type: 'num' },
    { key: 'mezuzotResidentialInstalled', label: 'מזוזות מותקנות (חדרי מגורים)', type: 'num' },
    { key: 'mezuzotOtherNeeded', label: 'מזוזות נדרשות (שאר דלתות)', type: 'num' },
    { key: 'mezuzotOtherInstalled', label: 'מזוזות מותקנות (שאר דלתות)', type: 'num' },
    { key: 'mezuzotNotes', label: 'הערות מזוזות', type: 'textarea' },
  ],
};
