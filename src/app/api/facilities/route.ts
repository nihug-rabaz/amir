import { NextResponse } from 'next/server';
import { FacilityRepo, ComplianceCalc } from '@/lib/repo';
import { FacilitiesListCache } from '@/lib/facilities-list-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CACHE_MS = 20_000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const withCompliance = searchParams.get('with') === 'compliance';
    const summary = searchParams.get('summary') === '1';
    const cacheKey = withCompliance ? `compliance:${summary ? 'summary' : 'full'}` : 'plain';
    const hit = FacilitiesListCache.get(cacheKey, CACHE_MS);
    if (hit) {
      return new NextResponse(hit, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    const facilities = await FacilityRepo.all();
    const payload = withCompliance
      ? { facilities: await ComplianceCalc.enrichAll(facilities, { summary }) }
      : { facilities };
    const body = JSON.stringify(payload);
    FacilitiesListCache.set(cacheKey, body);
    return new NextResponse(body, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { facility, actor } = await req.json();
    const created = await FacilityRepo.create(facility, actor || null);
    FacilitiesListCache.clear();
    return NextResponse.json({ facility: created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
