import { NextResponse } from 'next/server';
import { UserRepo } from '@/lib/repo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await UserRepo.all();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const saved = await UserRepo.upsert(body);
    return NextResponse.json({ user: saved });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json() as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await UserRepo.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
