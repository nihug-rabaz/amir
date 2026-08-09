import { NextResponse } from 'next/server';
import { isValidAuthCode, isValidIsraeliID, normalizeIsraeliID } from '@/lib/israeli-id';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_BASE = 'https://my.rabaz.co.il';
const DEFAULT_ORIGIN = 'https://amir.rabaz.co.il';
const UPSTREAM_TIMEOUT_MS = 12000;

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

function myIdfConfig() {
  return {
    apiKey: process.env.MYIDF_API_KEY || process.env.IDF_API_KEY || '',
    baseUrl: (process.env.MYIDF_BASE_URL || DEFAULT_BASE).replace(/\/$/, ''),
    origin: process.env.MYIDF_ORIGIN || DEFAULT_ORIGIN,
  };
}

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function callMyIdf(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  origin: string,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: origin,
  };
  if (apiKey) headers['X-Api-Key'] = apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    return { response, data, timedOut: false as const };
  } catch (e) {
    const timedOut = (e as Error).name === 'AbortError';
    return {
      response: null,
      data: { error: timedOut ? 'MyIDF timeout' : (e as Error).message },
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

function upstreamError(
  result: Awaited<ReturnType<typeof callMyIdf>>,
  fallback: string,
) {
  if (result.timedOut) return json({ isValid: false, error: 'MyIDF לא הגיב בזמן — נסו שוב' }, 504);
  const status = result.response?.status || 502;
  return json({
    isValid: false,
    error: String(result.data?.error || fallback || `MyIDF HTTP ${status}`),
  }, status >= 400 && status < 600 ? (status === 404 ? 502 : status) : 502);
}

// Step 1: look up the user by ID and trigger the SMS code.
async function sendCode(cleanId: string, apiKey: string, baseUrl: string, origin: string) {
  const body = { idNumber: cleanId };
  // Prefer legacy — current MyIDF host answers /api/idf/* reliably; /api/v1/* often 403/404.
  const legacy = await callMyIdf('/api/idf/users', body, apiKey, baseUrl, origin);
  if (legacy.response?.ok && legacy.data?.sessionCookie) {
    return json({
      isValid: true,
      mobilePhone: legacy.data.mobilePhone ? String(legacy.data.mobilePhone) : undefined,
      sessionCookie: String(legacy.data.sessionCookie),
    });
  }
  if (legacy.response?.ok && (legacy.data?.isValid === false || legacy.data?.error)) {
    return json({ isValid: false, error: String(legacy.data.error || 'User not found in MyIDF') });
  }

  const v1 = await callMyIdf('/api/v1/idf/users', body, apiKey, baseUrl, origin);
  if (v1.response?.ok && v1.data?.mobilePhone && v1.data?.sessionCookie) {
    return json({
      isValid: true,
      mobilePhone: String(v1.data.mobilePhone),
      sessionCookie: String(v1.data.sessionCookie),
    });
  }
  if (v1.response?.ok && (v1.data?.isValid === false || v1.data?.error)) {
    return json({ isValid: false, error: String(v1.data.error || 'User not found in MyIDF') });
  }
  return upstreamError(legacy.timedOut ? legacy : (v1.response ? v1 : legacy), String(legacy.data?.error || v1.data?.error || 'MyIDF users failed'));
}

// Step 2: validate the SMS code using the session cookie from step 1.
async function validateCode(
  cleanId: string,
  code: string,
  sessionCookie: string,
  apiKey: string,
  baseUrl: string,
  origin: string,
) {
  if (!sessionCookie) return json({ isValid: false, error: 'Missing sessionCookie' }, 400);
  if (!isValidAuthCode(code)) return json({ isValid: false, error: 'קוד אימות לא תקין' });

  const body = { idNumber: cleanId, code, sessionCookie };
  const legacy = await callMyIdf('/api/idf/validate-code', body, apiKey, baseUrl, origin);
  if (legacy.response?.ok && legacy.data) {
    if (legacy.data.isValid === true) {
      return json({ isValid: true, token: legacy.data.token ? String(legacy.data.token) : undefined });
    }
    return json({ isValid: false, error: String(legacy.data.error || 'קוד האימות שגוי או שפג תוקפו') });
  }

  const v1 = await callMyIdf('/api/v1/idf/validate-code', body, apiKey, baseUrl, origin);
  if (v1.response?.ok && v1.data) {
    if (v1.data.isValid === true) {
      return json({ isValid: true, token: v1.data.token ? String(v1.data.token) : undefined });
    }
    return json({ isValid: false, error: String(v1.data.error || 'קוד האימות שגוי או שפג תוקפו') });
  }
  return upstreamError(legacy.timedOut ? legacy : (v1.response ? v1 : legacy), String(legacy.data?.error || v1.data?.error || 'MyIDF validate failed'));
}

export async function POST(req: Request) {
  try {
    const { idNumber, code, sessionCookie } = await req.json() as {
      idNumber?: string; code?: string; sessionCookie?: string;
    };
    const cleanId = normalizeIsraeliID(idNumber);
    if (!cleanId) return json({ isValid: false, error: 'Missing idNumber' }, 400);
    if (!isValidIsraeliID(cleanId)) return json({ isValid: false, error: 'מספר תעודת זהות לא תקין' });

    const { apiKey, baseUrl, origin } = myIdfConfig();
    if (!isValidHttpUrl(baseUrl)) {
      return json({ isValid: false, error: 'הגדרת MYIDF_BASE_URL לא תקינה — בדוק את .env.local' }, 500);
    }
    if (!apiKey || apiKey === '[SENSITIVE]') {
      return json({ isValid: false, error: 'חסר MYIDF_API_KEY תקין — בדוק את .env.local' }, 500);
    }
    if (code) return validateCode(cleanId, code.trim(), String(sessionCookie || ''), apiKey, baseUrl, origin);
    return sendCode(cleanId, apiKey, baseUrl, origin);
  } catch (e) {
    return json({ isValid: false, error: (e as Error).message }, 500);
  }
}
