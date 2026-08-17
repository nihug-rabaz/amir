import { FacilityRepo, UserRepo } from '@/lib/repo';
import { jsonUtf8 } from '@/lib/utf8';
import { UserExcelValidator } from '@/lib/userExcel';
import { UserExcelWorkbook } from '@/lib/userExcelWorkbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const facilities = await FacilityRepo.all();
    const buffer = await UserExcelWorkbook.templateBuffer(facilities);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="amir-users-template.xlsx"',
      },
    });
  } catch (e) {
    return jsonUtf8({ error: (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return jsonUtf8({ error: 'לא הועלה קובץ אקסל' }, 400);
    const raw = await file.arrayBuffer();
    const rows = await UserExcelWorkbook.parseBuffer(raw);
    if (rows.length === 0) return jsonUtf8({ error: 'הקובץ ריק — אין שורות לייבוא' }, 400);

    const [facilities, existing] = await Promise.all([FacilityRepo.all(), UserRepo.all()]);
    const { valid, errors } = UserExcelValidator.validate(
      rows,
      facilities,
      existing.map((u) => u.personalId),
    );

    const created = [];
    for (const item of valid) {
      created.push(await UserRepo.upsert(item.user));
    }

    return jsonUtf8({
      created: created.length,
      skipped: errors.length,
      users: created,
      errors,
    });
  } catch (e) {
    return jsonUtf8({ error: (e as Error).message }, 500);
  }
}
