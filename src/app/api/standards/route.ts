import { NextResponse } from 'next/server';
import { StandardRepo, TierRepo, ItemRepo, AuditRepo } from '@/lib/repo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [standards, tiers, items] = await Promise.all([
      StandardRepo.all(),
      TierRepo.all(),
      ItemRepo.all(),
    ]);
    return NextResponse.json({ standards, tiers, items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { changes, actor } = await req.json() as { changes: Array<{ tierId: string; itemId: string; qty: number }>; actor?: { name: string } };
    for (const c of changes) {
      await StandardRepo.save(c.tierId, c.itemId, c.qty);
    }
    await AuditRepo.log({
      user: actor?.name || 'מערכת',
      action: 'update', entity: 'standards', entityId: null,
      summary: `עודכנו ${changes.length} ערכי תקן`,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
