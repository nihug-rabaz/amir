import { NextResponse } from 'next/server';
import { FacilityRepo, ComplianceCalc, AuditRepo } from '@/lib/repo';
import { FacilitiesListCache } from '@/lib/facilities-list-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const facility = await FacilityRepo.find(ctx.params.id);
    if (!facility) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const [inventory, audit] = await Promise.all([
      FacilityRepo.inventoryOf(facility.id),
      AuditRepo.forEntity('facility', facility.id),
    ]);
    const compliance = await ComplianceCalc.compute(facility, inventory);
    return NextResponse.json({ facility, inventory, compliance, audit });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const { facility, actor } = await req.json();
    const updated = await FacilityRepo.update(ctx.params.id, facility, actor || null);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    FacilitiesListCache.clear();
    return NextResponse.json({ facility: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
