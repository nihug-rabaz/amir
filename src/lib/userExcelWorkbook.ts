import ExcelJS from 'exceljs';
import type { Facility } from './types';
import {
  ALL_SCOPE,
  UserExcelCatalog,
  UserExcelParser,
  USER_EXCEL_HEADERS,
  type LabelRange,
  type NamedValueList,
  type UserExcelCascade,
  type UserExcelRawRow,
} from './userExcel';

const DATA_ROWS = 200;
const LISTS_SHEET = 'רשימות';
const DATA_SHEET = 'משתמשים';

function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function applyList(cell: ExcelJS.Cell, formula: string, allowBlank: boolean) {
  cell.dataValidation = {
    type: 'list',
    allowBlank,
    formulae: [formula],
    showErrorMessage: true,
    errorTitle: 'ערך לא חוקי',
    error: 'יש לבחור ערך מהרשימה המסוננת',
    showInputMessage: true,
    promptTitle: 'בחירה',
    prompt: 'האופציות משתנות לפי הפיקוד / אוגדה / חטיבה שנבחרו',
  };
}

// Write label→address lookup table; returns the range reference for VLOOKUP.
function writeLookup(sheet: ExcelJS.Worksheet, col: number, title: string, rows: LabelRange[]): string {
  sheet.getCell(1, col).value = title;
  sheet.getCell(1, col + 1).value = 'כתובת';
  rows.forEach((row, i) => {
    sheet.getCell(i + 2, col).value = row.label;
    sheet.getCell(i + 2, col + 1).value = row.range; // absolute cell address
  });
  const startCol = colLetter(col);
  const endCol = colLetter(col + 1);
  return `'${LISTS_SHEET}'!$${startCol}$2:$${endCol}$${Math.max(rows.length, 1) + 1}`;
}

export class UserExcelWorkbook {
  static async templateBuffer(facilities: Pick<Facility, 'command' | 'division' | 'brigade' | 'battalion'>[]): Promise<Buffer> {
    const cascade = UserExcelCatalog.cascade(facilities);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'אמי״ר';
    wb.calcProperties.fullCalcOnLoad = true;
    const data = wb.addWorksheet(DATA_SHEET, { views: [{ rightToLeft: true }] });
    const listsSheet = wb.addWorksheet(LISTS_SHEET, { state: 'hidden' });
    const resolvedCascade = this.writeLists(listsSheet, cascade);
    this.writeDataSheet(data, resolvedCascade);
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  static async parseBuffer(input: ArrayBuffer): Promise<UserExcelRawRow[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(input as never);
    const sheet = wb.worksheets.find((s) => s.name === DATA_SHEET) || wb.worksheets[0];
    if (!sheet) throw new Error('לא נמצא גיליון נתונים בקובץ');
    const matrix: unknown[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > DATA_ROWS + 1) return;
      const values: unknown[] = [];
      for (let c = 1; c <= USER_EXCEL_HEADERS.length; c++) values.push(row.getCell(c).value);
      matrix.push(values);
    });
    return UserExcelParser.fromMatrix(matrix);
  }

  // Writes all lists into the hidden sheet and converts name→address references.
  // Returns a cascade where every LabelRange.range is a concrete cell-address string
  // that Excel's INDIRECT() can resolve reliably (no Named Ranges needed).
  private static writeLists(
    sheet: ExcelJS.Worksheet,
    cascade: UserExcelCascade,
  ): ResolvedCascade {
    // Col A — roles
    sheet.getCell(1, 1).value = 'תפקיד';
    cascade.roles.forEach((v, i) => { sheet.getCell(i + 2, 1).value = v; });
    const roleAddr = `'${LISTS_SHEET}'!$A$2:$A$${cascade.roles.length + 1}`;

    // Col B — commands
    sheet.getCell(1, 2).value = 'פיקוד';
    cascade.commands.forEach((v, i) => { sheet.getCell(i + 2, 2).value = v; });
    const commandAddr = `'${LISTS_SHEET}'!$B$2:$B$${cascade.commands.length + 1}`;

    // Cols C onwards — individual value lists, each list in one column.
    // Build a map: list.name → absolute cell-address string.
    let listCol = 3;
    const nameToAddr = new Map<string, string>();

    for (const list of cascade.namedLists) {
      nameToAddr.set(list.name, this.writeListCol(sheet, listCol, list));
      listCol += 1;
    }

    // Resolve LabelRange arrays so .range holds the address, not the list name.
    function resolve(lr: LabelRange): LabelRange {
      const addr = nameToAddr.get(lr.range);
      if (!addr) throw new Error(`Unknown list name: ${lr.range}`);
      return { label: lr.label, range: addr };
    }

    const commandToDivRange = cascade.commandToDivRange.map(resolve);
    const pairToBrgRange = cascade.pairToBrgRange.map(resolve);
    const tripleToBtnRange = cascade.tripleToBtnRange.map(resolve);

    // Write the three lookup tables (label → address) starting at col C of the lookup area.
    // Place them after all list columns so they don't collide.
    const lookupStart = listCol + 1;
    const cmdMapRef = writeLookup(sheet, lookupStart, 'פיקוד', commandToDivRange);
    const pairMapRef = writeLookup(sheet, lookupStart + 2, 'פיקוד|אוגדה', pairToBrgRange);
    const tripleMapRef = writeLookup(sheet, lookupStart + 4, 'פיקוד|אוגדה|חטיבה', tripleToBtnRange);

    return {
      roles: cascade.roles,
      commands: cascade.commands,
      roleAddr,
      commandAddr,
      cmdMapRef,
      pairMapRef,
      tripleMapRef,
      allDivAddr: nameToAddr.get(cascade.allDivRange)!,
      allBrgAddr: nameToAddr.get(cascade.allBrgRange)!,
      allBtnAddr: nameToAddr.get(cascade.allBtnRange)!,
    };
  }

  // Writes a single column of values and returns the absolute cell-address string.
  private static writeListCol(sheet: ExcelJS.Worksheet, col: number, list: NamedValueList): string {
    const letter = colLetter(col);
    sheet.getCell(1, col).value = list.name;
    list.values.forEach((v, i) => { sheet.getCell(i + 2, col).value = v; });
    const lastRow = Math.max(list.values.length, 1) + 1;
    return `'${LISTS_SHEET}'!$${letter}$2:$${letter}$${lastRow}`;
  }

  private static writeDataSheet(sheet: ExcelJS.Worksheet, rc: ResolvedCascade) {
    const header = sheet.getRow(1);
    USER_EXCEL_HEADERS.forEach((title, i) => {
      const cell = header.getCell(i + 1);
      cell.value = title;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A5E' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    header.getCell(8).value = 'כתובת_אוגדה';
    header.getCell(9).value = 'כתובת_חטיבה';
    header.getCell(10).value = 'כתובת_גדוד';
    header.height = 22;

    sheet.columns = [
      { width: 22 },
      { width: 14 },
      { width: 26 },
      { width: 18 },
      { width: 24 },
      { width: 24 },
      { width: 26 },
      { width: 14, hidden: true },
      { width: 14, hidden: true },
      { width: 14, hidden: true },
    ];
    sheet.getColumn(2).numFmt = '@';
    sheet.getColumn(8).hidden = true;
    sheet.getColumn(9).hidden = true;
    sheet.getColumn(10).hidden = true;

    const allCmd = ALL_SCOPE.command.replace(/"/g, '""');
    const allDiv = ALL_SCOPE.division.replace(/"/g, '""');
    const allBrg = ALL_SCOPE.brigade.replace(/"/g, '""');

    // Fallback addresses — written as plain strings so INDIRECT returns them verbatim.
    const fallbackDiv = rc.allDivAddr;
    const fallbackBrg = rc.allBrgAddr;
    const fallbackBtn = rc.allBtnAddr;

    for (let r = 2; r <= DATA_ROWS + 1; r++) {
      // H: address for division dropdown — look up by command value.
      sheet.getCell(r, 8).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r}),${rc.cmdMapRef},2,FALSE),"${fallbackDiv}")`,
      };
      // I: address for brigade dropdown — look up by "command|division".
      sheet.getCell(r, 9).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r})&"|"&IF(OR(E${r}="",E${r}="${allDiv}"),"${allDiv}",E${r}),${rc.pairMapRef},2,FALSE),"${fallbackBrg}")`,
      };
      // J: address for battalion dropdown — look up by "command|division|brigade".
      sheet.getCell(r, 10).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r})&"|"&IF(OR(E${r}="",E${r}="${allDiv}"),"${allDiv}",E${r})&"|"&IF(OR(F${r}="",F${r}="${allBrg}"),"${allBrg}",F${r}),${rc.tripleMapRef},2,FALSE),"${fallbackBtn}")`,
      };
      applyList(sheet.getCell(r, 3), rc.roleAddr, false);
      applyList(sheet.getCell(r, 4), rc.commandAddr, true);
      // Division / brigade / battalion use INDIRECT of the cell-address computed above.
      applyList(sheet.getCell(r, 5), `INDIRECT(H${r})`, true);
      applyList(sheet.getCell(r, 6), `INDIRECT(I${r})`, true);
      applyList(sheet.getCell(r, 7), `INDIRECT(J${r})`, true);
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: USER_EXCEL_HEADERS.length },
    };
    sheet.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];
  }
}

interface ResolvedCascade {
  roles: string[];
  commands: string[];
  roleAddr: string;
  commandAddr: string;
  cmdMapRef: string;
  pairMapRef: string;
  tripleMapRef: string;
  allDivAddr: string;
  allBrgAddr: string;
  allBtnAddr: string;
}
