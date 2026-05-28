import { NextResponse } from 'next/server';
import { FacilityRepo } from '@/lib/repo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const inv = await FacilityRepo.inventoryOf(ctx.params.id);
    return NextResponse.json({ inventory: inv });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const { inventory, actor } = await req.json();
    await FacilityRepo.saveInventory(ctx.params.id, inventory || {}, actor || null);
    const next = await FacilityRepo.inventoryOf(ctx.params.id);
    return NextResponse.json({ inventory: next });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
