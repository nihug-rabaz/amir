import { NextResponse } from 'next/server';
import { isValidAuthCode, isValidIsraeliID, normalizeIsraeliID } from '@/lib/israeli-id';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface MyIdfPayload {
  isValid: boolean;
  mobilePhone?: string;
  sessionCookie?: string;
  token?: string;
  error?: string;
}

function json(data: MyIdfPayload, status = 200) {
  return NextResponse.json(data, { status });
}

async function callMyIdf(path: string, body: Record<string, unknown>, apiKey: string, baseUrl: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Api-Key'] = apiKey;
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  return { response, data };
}

// Step 1: look up the user by ID and trigger the SMS code, returning the masked phone + session cookie.
async function sendCode(cleanId: string, apiKey: string, baseUrl: string) {
  if (apiKey) {
    const v1 = await callMyIdf('/api/v1/idf/users', { idNumber: cleanId }, apiKey, baseUrl);
    if (v1.response.ok && v1.data?.mobilePhone && v1.data?.sessionCookie) {
      return json({
        isValid: true,
        mobilePhone: String(v1.data.mobilePhone),
        sessionCookie: String(v1.data.sessionCookie),
      });
    }
    if (v1.response.ok && (v1.data?.isValid === false || v1.data?.error)) {
      return json({ isValid: false, error: String(v1.data.error || 'User not found in MyIDF') });
    }
  }

  const legacy = await callMyIdf('/api/idf/users', { idNumber: cleanId }, apiKey, baseUrl);
  if (legacy.response.ok && legacy.data?.sessionCookie) {
    return json({
      isValid: true,
      mobilePhone: legacy.data.mobilePhone ? String(legacy.data.mobilePhone) : undefined,
      sessionCookie: String(legacy.data.sessionCookie),
    });
  }

  return json({
    isValid: false,
    error: String(legacy.data?.error || `MyIDF HTTP ${legacy.response.status}`),
  }, legacy.response.ok ? 200 : 502);
}

// Step 2: validate the SMS code against MyIDF using the session cookie from step 1.
async function validateCode(cleanId: string, code: string, sessionCookie: string, apiKey: string, baseUrl: string) {
  if (!sessionCookie) return json({ isValid: false, error: 'Missing sessionCookie' }, 400);
  if (!isValidAuthCode(code)) return json({ isValid: false, error: 'קוד אימות לא תקין' });

  const result = await callMyIdf('/api/idf/validate-code', { idNumber: cleanId, code, sessionCookie }, apiKey, baseUrl);
  if (!result.response.ok || !result.data) {
    return json({ isValid: false, error: String(result.data?.error || `MyIDF HTTP ${result.response.status}`) }, 502);
  }
  if (result.data.isValid === true) {
    return json({ isValid: true, token: result.data.token ? String(result.data.token) : undefined });
  }
  return json({ isValid: false, error: 'קוד האימות שגוי או שפג תוקפו' });
}

export async function POST(req: Request) {
  try {
    const { idNumber, code, sessionCookie } = await req.json() as {
      idNumber?: string; code?: string; sessionCookie?: string;
    };
    const cleanId = normalizeIsraeliID(idNumber);
    if (!cleanId) return json({ isValid: false, error: 'Missing idNumber' }, 400);
    if (!isValidIsraeliID(cleanId)) return json({ isValid: false, error: 'מספר תעודת זהות לא תקין' });

    const apiKey = process.env.MYIDF_API_KEY || process.env.IDF_API_KEY || '';
    const baseUrl = (process.env.MYIDF_BASE_URL || 'https://myidf.rabaz.co.il').replace(/\/$/, '');

    if (code) return validateCode(cleanId, code.trim(), String(sessionCookie || ''), apiKey, baseUrl);
    return sendCode(cleanId, apiKey, baseUrl);
  } catch (e) {
    return json({ isValid: false, error: (e as Error).message }, 500);
  }
}
