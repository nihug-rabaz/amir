import { BATTALIONS, BRIGADES, DIVISIONS, ROLE_LABELS } from './catalog';
import { normalizeIsraeliID } from './israeli-id';
import { uid } from './format';
import { battalionOptions, brigadeOptions, commandOptions, divisionOptions } from './scopeOptions';
import type { Facility, Role, User } from './types';

export type ImportableRole = Exclude<Role, 'admin'>;

export const USER_EXCEL_HEADERS = [
  'שם מלא',
  'ת״ז',
  'תפקיד / הרשאה',
  'פיקוד',
  'אוגדה',
  'חטיבה',
  'גדוד',
] as const;

export const ALL_SCOPE = {
  command: 'כל הפיקודים',
  division: 'כל האוגדות',
  brigade: 'כל החטיבות',
  battalion: 'כל הגדודים',
} as const;

export const IMPORTABLE_ROLE_LABELS: Record<ImportableRole, string> = {
  unit_manager: ROLE_LABELS.unit_manager,
  field_rabbi: ROLE_LABELS.field_rabbi,
  hq_viewer: ROLE_LABELS.hq_viewer,
};

export interface UserExcelLists {
  roles: string[];
  commands: string[];
  divisions: string[];
  brigades: string[];
  battalions: string[];
}

export interface NamedValueList {
  name: string;
  values: string[];
}

export interface LabelRange {
  label: string;
  range: string;
}

export interface UserExcelCascade {
  roles: string[];
  commands: string[];
  commandToDivRange: LabelRange[];
  pairToBrgRange: LabelRange[];
  tripleToBtnRange: LabelRange[];
  namedLists: NamedValueList[];
  allDivRange: string;
  allBrgRange: string;
  allBtnRange: string;
}

export interface UserExcelRawRow {
  row: number;
  name: string;
  personalId: string;
  role: string;
  command: string;
  division: string;
  brigade: string;
  battalion: string;
}

export interface UserExcelError {
  row: number;
  message: string;
}

export interface UserExcelValidRow {
  row: number;
  user: User;
}

type ScopeFacility = Pick<Facility, 'command' | 'division' | 'brigade' | 'battalion'>;

function uniqSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== '')))
    .sort((a, b) => a.localeCompare(b, 'he'));
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text: unknown }).text ?? '').trim();
  }
  if (typeof value === 'object' && value && 'result' in value) {
    return cellText((value as { result: unknown }).result);
  }
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function isAll(value: string, token: string): boolean {
  const v = value.trim();
  return !v || v === token || v === `— ${token} —`;
}

function toScope(value: string, allToken: string): string | null {
  return isAll(value, allToken) ? null : value.trim();
}

function roleFromLabel(label: string): ImportableRole | null {
  const v = label.trim();
  const hit = (Object.entries(IMPORTABLE_ROLE_LABELS) as Array<[ImportableRole, string]>)
    .find(([, name]) => name === v);
  return hit ? hit[0] : null;
}

export class UserExcelCatalog {
  static lists(facilities: ScopeFacility[]): UserExcelLists {
    return {
      roles: Object.values(IMPORTABLE_ROLE_LABELS),
      commands: [ALL_SCOPE.command, ...commandOptions(facilities)],
      divisions: [ALL_SCOPE.division, ...uniqSorted([
        ...Object.values(DIVISIONS).flat(),
        ...facilities.map((f) => f.division),
      ])],
      brigades: [ALL_SCOPE.brigade, ...uniqSorted([
        ...Object.values(BRIGADES).flat(),
        ...facilities.map((f) => f.brigade),
      ])],
      battalions: [ALL_SCOPE.battalion, ...uniqSorted([
        ...Object.values(BATTALIONS).flat(),
        ...facilities.map((f) => f.battalion),
      ])],
    };
  }

  // Builds named lists so Excel dropdowns filter by the parent cell in the same row.
  static cascade(facilities: ScopeFacility[]): UserExcelCascade {
    const namedLists: NamedValueList[] = [];
    const allDivRange = 'ch_d_all';
    const allBrgRange = 'ch_b_all';
    const allBtnRange = 'ch_n_all';
    namedLists.push({ name: allDivRange, values: [ALL_SCOPE.division] });
    namedLists.push({ name: allBrgRange, values: [ALL_SCOPE.brigade] });
    namedLists.push({ name: allBtnRange, values: [ALL_SCOPE.battalion] });

    const commandToDivRange: LabelRange[] = [{ label: ALL_SCOPE.command, range: allDivRange }];
    const pairToBrgRange: LabelRange[] = [{ label: `${ALL_SCOPE.command}|${ALL_SCOPE.division}`, range: allBrgRange }];
    const tripleToBtnRange: LabelRange[] = [{
      label: `${ALL_SCOPE.command}|${ALL_SCOPE.division}|${ALL_SCOPE.brigade}`,
      range: allBtnRange,
    }];

    const commands = commandOptions(facilities);
    commands.forEach((command, commandIdx) => {
      const divisions = divisionOptions(facilities, command);
      const divRange = `ch_d_${commandIdx + 1}`;
      namedLists.push({ name: divRange, values: [ALL_SCOPE.division, ...divisions] });
      commandToDivRange.push({ label: command, range: divRange });
      pairToBrgRange.push({ label: `${command}|${ALL_SCOPE.division}`, range: allBrgRange });

      divisions.forEach((division, divisionIdx) => {
        const brigades = brigadeOptions(facilities, command, division);
        const brgRange = `ch_b_${commandIdx + 1}_${divisionIdx + 1}`;
        namedLists.push({ name: brgRange, values: [ALL_SCOPE.brigade, ...brigades] });
        pairToBrgRange.push({ label: `${command}|${division}`, range: brgRange });
        tripleToBtnRange.push({ label: `${command}|${division}|${ALL_SCOPE.brigade}`, range: allBtnRange });

        brigades.forEach((brigade, brigadeIdx) => {
          const battalions = battalionOptions(facilities, command, division, brigade);
          const btnRange = `ch_n_${commandIdx + 1}_${divisionIdx + 1}_${brigadeIdx + 1}`;
          namedLists.push({ name: btnRange, values: [ALL_SCOPE.battalion, ...battalions] });
          tripleToBtnRange.push({ label: `${command}|${division}|${brigade}`, range: btnRange });
        });
      });
    });

    return {
      roles: Object.values(IMPORTABLE_ROLE_LABELS),
      commands: [ALL_SCOPE.command, ...commands],
      commandToDivRange,
      pairToBrgRange,
      tripleToBtnRange,
      namedLists,
      allDivRange,
      allBrgRange,
      allBtnRange,
    };
  }
}

export class UserExcelParser {
  static fromMatrix(rows: unknown[][]): UserExcelRawRow[] {
    if (rows.length < 2) return [];
    const header = rows[0].map(cellText);
    const idx = (name: string) => header.findIndex((h) => h === name);
    const nameI = idx(USER_EXCEL_HEADERS[0]);
    const idI = idx(USER_EXCEL_HEADERS[1]);
    const roleI = idx(USER_EXCEL_HEADERS[2]);
    const commandI = idx(USER_EXCEL_HEADERS[3]);
    const divisionI = idx(USER_EXCEL_HEADERS[4]);
    const brigadeI = idx(USER_EXCEL_HEADERS[5]);
    const battalionI = idx(USER_EXCEL_HEADERS[6]);
    if ([nameI, idI, roleI, commandI, divisionI, brigadeI, battalionI].some((i) => i < 0)) {
      throw new Error('קובץ לא תואם לתבנית — הורידו תבנית חדשה מהמערכת');
    }

    const out: UserExcelRawRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const line = rows[i] || [];
      const row: UserExcelRawRow = {
        row: i + 1,
        name: cellText(line[nameI]),
        personalId: cellText(line[idI]),
        role: cellText(line[roleI]),
        command: cellText(line[commandI]),
        division: cellText(line[divisionI]),
        brigade: cellText(line[brigadeI]),
        battalion: cellText(line[battalionI]),
      };
      if (!row.name && !row.personalId && !row.role && !row.command && !row.division && !row.brigade && !row.battalion) {
        continue;
      }
      out.push(row);
    }
    return out;
  }
}

export class UserExcelValidator {
  static validate(
    rows: UserExcelRawRow[],
    facilities: ScopeFacility[],
    existingPersonalIds: string[],
  ): { valid: UserExcelValidRow[]; errors: UserExcelError[] } {
    const valid: UserExcelValidRow[] = [];
    const errors: UserExcelError[] = [];
    const seen = new Set(existingPersonalIds.map(normalizeIsraeliID).filter(Boolean));
    const lists = UserExcelCatalog.lists(facilities);

    for (const raw of rows) {
      const messages = this.rowErrors(raw, facilities, lists, seen);
      if (messages.length) {
        errors.push(...messages.map((message) => ({ row: raw.row, message })));
        continue;
      }
      const personalId = normalizeIsraeliID(raw.personalId);
      seen.add(personalId);
      valid.push({
        row: raw.row,
        user: {
          id: uid('u'),
          name: raw.name.trim(),
          personalId,
          role: roleFromLabel(raw.role) as ImportableRole,
          scope: {
            command: toScope(raw.command, ALL_SCOPE.command),
            division: toScope(raw.division, ALL_SCOPE.division),
            brigade: toScope(raw.brigade, ALL_SCOPE.brigade),
            battalion: toScope(raw.battalion, ALL_SCOPE.battalion),
          },
          active: true,
          email: null,
        },
      });
    }
    return { valid, errors };
  }

  private static rowErrors(
    raw: UserExcelRawRow,
    facilities: ScopeFacility[],
    lists: UserExcelLists,
    seen: Set<string>,
  ): string[] {
    const errors: string[] = [];
    if (!raw.name.trim()) errors.push('חסר שם מלא');

    const personalId = normalizeIsraeliID(raw.personalId);
    if (!personalId) errors.push('חסרה ת״ז');
    else if (!/^\d{1,9}$/.test(personalId)) errors.push('ת״ז חייבת להכיל ספרות בלבד');
    else if (seen.has(personalId)) errors.push(`ת״ז ${personalId} כבר קיימת במערכת או בקובץ`);

    if (!raw.role.trim()) errors.push('חסר תפקיד / הרשאה');
    else if (raw.role.trim() === ROLE_LABELS.admin) errors.push('לא ניתן לייבא משתמש עם תפקיד מנהל מערכת');
    else if (!roleFromLabel(raw.role)) {
      errors.push(`תפקיד לא מוכר: ${raw.role}. יש לבחור מהרשימה`);
    }

    const command = toScope(raw.command, ALL_SCOPE.command);
    const division = toScope(raw.division, ALL_SCOPE.division);
    const brigade = toScope(raw.brigade, ALL_SCOPE.brigade);
    const battalion = toScope(raw.battalion, ALL_SCOPE.battalion);

    if (raw.command.trim() && !lists.commands.includes(raw.command.trim())) {
      errors.push(`פיקוד לא מוכר: ${raw.command}`);
    }
    if (raw.division.trim() && !lists.divisions.includes(raw.division.trim())) {
      errors.push(`אוגדה לא מוכרת: ${raw.division}`);
    }
    if (raw.brigade.trim() && !lists.brigades.includes(raw.brigade.trim())) {
      errors.push(`חטיבה לא מוכרת: ${raw.brigade}`);
    }
    if (raw.battalion.trim() && !lists.battalions.includes(raw.battalion.trim())) {
      errors.push(`גדוד לא מוכר: ${raw.battalion}`);
    }

    if (division && !command) errors.push('יש לבחור פיקוד לפני אוגדה');
    if (brigade && !division) errors.push('יש לבחור אוגדה לפני חטיבה');
    if (battalion && !brigade) errors.push('יש לבחור חטיבה לפני גדוד');

    if (command && division) {
      const allowed = divisionOptions(facilities, command);
      if (!allowed.includes(division)) {
        errors.push(`האוגדה ${division} אינה שייכת לפיקוד ${command}`);
      }
    }
    if (command && division && brigade) {
      const allowed = brigadeOptions(facilities, command, division);
      if (!allowed.includes(brigade)) {
        errors.push(`החטיבה ${brigade} אינה שייכת לאוגדה ${division}`);
      }
    }
    if (command && division && brigade && battalion) {
      const allowed = battalionOptions(facilities, command, division, brigade);
      if (!allowed.includes(battalion)) {
        errors.push(`הגדוד ${battalion} אינו שייך לחטיבה ${brigade}`);
      }
    }

    return errors;
  }
}
