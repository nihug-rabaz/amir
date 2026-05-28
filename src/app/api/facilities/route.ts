import { NextResponse } from 'next/server';
import { FacilityRepo, ComplianceCalc } from '@/lib/repo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const withCompliance = searchParams.get('with') === 'compliance';
    const facilities = await FacilityRepo.all();
    if (withCompliance) {
      const enriched = await ComplianceCalc.enrichAll(facilities);
      return NextResponse.json({ facilities: enriched });
    }
    return NextResponse.json({ facilities });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { facility, actor } = await req.json();
    const created = await FacilityRepo.create(facility, actor || null);
    return NextResponse.json({ facility: created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
