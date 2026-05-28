import { NextResponse } from 'next/server';
import { AuditRepo } from '@/lib/repo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await AuditRepo.all(200);
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
