import { UserRepo } from '@/lib/repo';
import { jsonUtf8 } from '@/lib/utf8';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await UserRepo.all();
    return jsonUtf8({ users });
  } catch (e) {
    return jsonUtf8({ error: (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const saved = await UserRepo.upsert(body);
    return jsonUtf8({ user: saved });
  } catch (e) {
    return jsonUtf8({ error: (e as Error).message }, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json() as { id?: string };
    if (!id) return jsonUtf8({ error: 'Missing id' }, 400);
    await UserRepo.delete(id);
    return jsonUtf8({ ok: true });
  } catch (e) {
    return jsonUtf8({ error: (e as Error).message }, 500);
  }
}
