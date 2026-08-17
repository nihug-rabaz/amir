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

function writeLookup(sheet: ExcelJS.Worksheet, col: number, title: string, rows: LabelRange[]) {
  sheet.getCell(1, col).value = title;
  sheet.getCell(1, col + 1).value = 'טווח';
  rows.forEach((row, i) => {
    sheet.getCell(i + 2, col).value = row.label;
    sheet.getCell(i + 2, col + 1).value = row.range;
  });
}

function lookupRef(col: number, count: number): string {
  const start = colLetter(col);
  const end = colLetter(col + 1);
  return `'${LISTS_SHEET}'!$${start}$2:$${end}$${Math.max(count, 1) + 1}`;
}

export class UserExcelWorkbook {
  static async templateBuffer(facilities: Pick<Facility, 'command' | 'division' | 'brigade' | 'battalion'>[]): Promise<Buffer> {
    const cascade = UserExcelCatalog.cascade(facilities);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'אמי״ר';
    wb.calcProperties.fullCalcOnLoad = true;
    const data = wb.addWorksheet(DATA_SHEET, { views: [{ rightToLeft: true }] });
    const listsSheet = wb.addWorksheet(LISTS_SHEET, { state: 'hidden' });
    this.writeLists(wb, listsSheet, cascade);
    this.writeDataSheet(data, cascade);
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

  private static writeLists(wb: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, cascade: UserExcelCascade) {
    sheet.getCell(1, 1).value = 'תפקיד';
    cascade.roles.forEach((v, i) => { sheet.getCell(i + 2, 1).value = v; });
    sheet.getCell(1, 2).value = 'פיקוד';
    cascade.commands.forEach((v, i) => { sheet.getCell(i + 2, 2).value = v; });

    writeLookup(sheet, 4, 'פיקוד', cascade.commandToDivRange);
    writeLookup(sheet, 6, 'פיקוד|אוגדה', cascade.pairToBrgRange);
    writeLookup(sheet, 8, 'פיקוד|אוגדה|חטיבה', cascade.tripleToBtnRange);

    let listCol = 11;
    cascade.namedLists.forEach((list) => {
      this.writeNamedList(wb, sheet, listCol, list);
      listCol += 1;
    });
  }

  private static writeNamedList(
    wb: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    col: number,
    list: NamedValueList,
  ) {
    const letter = colLetter(col);
    sheet.getCell(1, col).value = list.name;
    list.values.forEach((v, i) => { sheet.getCell(i + 2, col).value = v; });
    const last = Math.max(list.values.length, 1) + 1;
    wb.definedNames.add(list.name, `'${LISTS_SHEET}'!$${letter}$2:$${letter}$${last}`);
  }

  private static writeDataSheet(sheet: ExcelJS.Worksheet, cascade: UserExcelCascade) {
    const header = sheet.getRow(1);
    USER_EXCEL_HEADERS.forEach((title, i) => {
      const cell = header.getCell(i + 1);
      cell.value = title;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A5E' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    header.getCell(8).value = 'טווח_אוגדה';
    header.getCell(9).value = 'טווח_חטיבה';
    header.getCell(10).value = 'טווח_גדוד';
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

    const roleF = `'${LISTS_SHEET}'!$A$2:$A$${cascade.roles.length + 1}`;
    const commandF = `'${LISTS_SHEET}'!$B$2:$B$${cascade.commands.length + 1}`;
    const cmdMap = lookupRef(4, cascade.commandToDivRange.length);
    const pairMap = lookupRef(6, cascade.pairToBrgRange.length);
    const tripleMap = lookupRef(8, cascade.tripleToBtnRange.length);
    const allCmd = ALL_SCOPE.command.replace(/"/g, '""');
    const allDiv = ALL_SCOPE.division.replace(/"/g, '""');
    const allBrg = ALL_SCOPE.brigade.replace(/"/g, '""');

    for (let r = 2; r <= DATA_ROWS + 1; r++) {
      sheet.getCell(r, 8).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r}),${cmdMap},2,FALSE),"${cascade.allDivRange}")`,
      };
      sheet.getCell(r, 9).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r})&"|"&IF(OR(E${r}="",E${r}="${allDiv}"),"${allDiv}",E${r}),${pairMap},2,FALSE),"${cascade.allBrgRange}")`,
      };
      sheet.getCell(r, 10).value = {
        formula: `IFERROR(VLOOKUP(IF(OR(D${r}="",D${r}="${allCmd}"),"${allCmd}",D${r})&"|"&IF(OR(E${r}="",E${r}="${allDiv}"),"${allDiv}",E${r})&"|"&IF(OR(F${r}="",F${r}="${allBrg}"),"${allBrg}",F${r}),${tripleMap},2,FALSE),"${cascade.allBtnRange}")`,
      };
      applyList(sheet.getCell(r, 3), roleF, false);
      applyList(sheet.getCell(r, 4), commandF, true);
      applyList(sheet.getCell(r, 5), `=INDIRECT(H${r})`, true);
      applyList(sheet.getCell(r, 6), `=INDIRECT(I${r})`, true);
      applyList(sheet.getCell(r, 7), `=INDIRECT(J${r})`, true);
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: USER_EXCEL_HEADERS.length },
    };
    sheet.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];
  }
}
