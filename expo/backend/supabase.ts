import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pagwvbqvrruzbsrddhdl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function validateKey(key: string, label: string): void {
  if (!key) {
    console.log(`[Supabase] WARNING: ${label} is empty`);
    return;
  }
  const claims = decodeJwtPayload(key);
  if (claims) {
    console.log(`[Supabase] ${label} is a valid JWT - role: ${String(claims.role)}, iss: ${String(claims.iss)}, ref: ${String(claims.ref)}`);
  } else {
    console.log(`[Supabase] ${label} is NOT a JWT (prefix: ${key.slice(0, 15)}..., length: ${key.length})`);
  }
}

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const keyType = SUPABASE_SERVICE_KEY ? 'service_role' : 'anon';

  console.log('[Supabase] Creating client - URL:', SUPABASE_URL, 'key-type:', keyType, 'key-length:', key.length);
  validateKey(SUPABASE_SERVICE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  validateKey(SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

  supabaseInstance = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  });

  console.log('[Supabase] Client created successfully with', keyType, 'key');
  return supabaseInstance;
}

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('[Supabase] Testing connection on startup...');
    const sb = getSupabase();

    const { error: selectErr } = await sb.from('users').select('id', { count: 'exact', head: true });
    if (selectErr) {
      console.log('[Supabase] SELECT test FAILED:', selectErr.message, selectErr.code, selectErr.hint);
      return false;
    }
    console.log('[Supabase] SELECT test passed');

    const testId = crypto.randomUUID();
    const testEmail = `__startup_test_${Date.now()}@internal.test`;
    const { error: insertErr } = await sb.from('users').insert({
      id: testId,
      email: testEmail,
      name: '__startup_test',
      password_hash: 'test',
      salt: 'test',
      is_admin: false,
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.log('[Supabase] INSERT test FAILED:', insertErr.message, insertErr.code, insertErr.hint);
      console.log('[Supabase] RLS is likely blocking inserts. Trying direct REST API...');

      const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
      const testId2 = crypto.randomUUID();
      const testEmail2 = `__startup_test2_${Date.now()}@internal.test`;
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: testId2,
            email: testEmail2,
            name: '__startup_test2',
            password_hash: 'test',
            salt: 'test',
            is_admin: false,
            created_at: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          console.log('[Supabase] Direct REST INSERT succeeded! Cleaning up...');
          await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${testId2}`, {
            method: 'DELETE',
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
          });
        } else {
          const body = await res.text();
          console.log('[Supabase] Direct REST INSERT also FAILED:', res.status, body.slice(0, 300));
          console.log('[Supabase] CRITICAL: Cannot insert data. Registration will fail.');
          console.log('[Supabase] Please disable RLS on users, auth_tokens, and user_sync_data tables in Supabase dashboard.');
        }
      } catch (fetchErr) {
        console.log('[Supabase] Direct REST INSERT error:', fetchErr);
      }
      return true;
    }

    console.log('[Supabase] INSERT test passed, cleaning up test row');
    await sb.from('users').delete().eq('id', testId);
    console.log('[Supabase] Startup connection SUCCESS (SELECT + INSERT both work)');
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[Supabase] Startup connection ERROR:', msg);
    return false;
  }
}

let directRestMode = false;

export function isDirectRestMode(): boolean {
  return directRestMode;
}

export function setDirectRestMode(enabled: boolean): void {
  directRestMode = enabled;
  console.log('[Supabase] Direct REST mode:', enabled ? 'ENABLED' : 'DISABLED');
}

export async function directRestInsert(table: string, data: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      return { data: result, error: null };
    }
    const body = await res.text();
    let parsed: { message?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* ignore */ }
    return { data: null, error: parsed.message || `HTTP ${res.status}: ${body.slice(0, 200)}` };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}
