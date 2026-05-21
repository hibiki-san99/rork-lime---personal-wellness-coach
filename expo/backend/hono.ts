import { Hono } from "hono";
import { cors } from "hono/cors";
import { getSupabase, directRestInsert } from "./supabase";

const app = new Hono();
app.use("*", cors());

interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  salt: string;
  is_admin: boolean;
  created_at: string;
  reset_token: string | null;
  reset_token_expiry: number | null;
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  isAdmin: boolean;
  createdAt: string;
  resetToken?: string;
  resetTokenExpiry?: number;
}

function dbToUser(row: DbUser): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    salt: row.salt,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    resetToken: row.reset_token ?? undefined,
    resetTokenExpiry: row.reset_token_expiry ?? undefined,
  };
}

async function hashPwd(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genId(): string {
  return crypto.randomUUID();
}

function genToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    console.log("[DB] findUserByEmail error:", error.message);
    return null;
  }
  return data ? dbToUser(data as DbUser) : null;
}

async function findUserById(id: string): Promise<StoredUser | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.log("[DB] findUserById error:", error.message);
    return null;
  }
  return data ? dbToUser(data as DbUser) : null;
}

async function getUserCount(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from("users")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log("[DB] getUserCount error:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function insertUser(user: StoredUser): Promise<void> {
  const sb = getSupabase();
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    password_hash: user.passwordHash,
    salt: user.salt,
    is_admin: user.isAdmin,
    reset_token: user.resetToken ?? null,
    reset_token_expiry: user.resetTokenExpiry ?? null,
    created_at: user.createdAt,
  };
  console.log("[DB] insertUser payload keys:", Object.keys(payload).join(", "));
  const { error } = await sb.from("users").insert(payload);
  if (error) {
    console.log("[DB] insertUser JS client error:", error.message, "code:", error.code);
    if (error.code === '42501') {
      console.log("[DB] RLS blocking insert, trying direct REST API...");
      const { error: restErr } = await directRestInsert('users', payload);
      if (restErr) {
        console.log("[DB] Direct REST insert also failed:", restErr);
        throw new Error(`insertUser: RLS policy blocks inserts. Please disable RLS on the 'users' table in your Supabase dashboard (SQL Editor: ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;)`);
      }
      console.log("[DB] Direct REST insert succeeded for user");
      return;
    }
    throw new Error(`insertUser: ${error.message} (code: ${error.code}, hint: ${error.hint || 'none'})`);
  }
}

async function updateUser(user: StoredUser): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("users")
    .update({
      name: user.name,
      password_hash: user.passwordHash,
      salt: user.salt,
      is_admin: user.isAdmin,
      reset_token: user.resetToken ?? null,
      reset_token_expiry: user.resetTokenExpiry ?? null,
    })
    .eq("id", user.id);
  if (error) {
    console.log("[DB] updateUser error:", error.message);
    throw new Error(error.message);
  }
}

async function insertToken(token: string, userId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("auth_tokens").insert({
    token,
    user_id: userId,
  });
  if (error) {
    console.log("[DB] insertToken JS client error:", error.message, "code:", error.code);
    if (error.code === '42501') {
      console.log("[DB] RLS blocking token insert, trying direct REST API...");
      const { error: restErr } = await directRestInsert('auth_tokens', { token, user_id: userId });
      if (restErr) {
        console.log("[DB] Direct REST token insert also failed:", restErr);
        throw new Error(`insertToken: RLS policy blocks inserts. Please disable RLS on the 'auth_tokens' table in your Supabase dashboard.`);
      }
      console.log("[DB] Direct REST token insert succeeded");
      return;
    }
    throw new Error(`insertToken: ${error.message} (code: ${error.code}, hint: ${error.hint || 'none'})`);
  }
}

async function findUserIdByToken(token: string): Promise<string | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("auth_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.log("[DB] findUserIdByToken error:", error.message);
    return null;
  }
  return data?.user_id ?? null;
}

async function upsertSyncData(userId: string, payload: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("user_sync_data")
    .upsert(
      { user_id: userId, data: payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    console.log("[DB] upsertSyncData error:", error.message, "code:", error.code);
    if (error.code === '42501') {
      console.log("[DB] RLS blocking upsert, trying direct REST API...");
      const { error: restErr } = await directRestInsert('user_sync_data', {
        user_id: userId,
        data: payload,
        updated_at: new Date().toISOString(),
      });
      if (restErr) {
        console.log("[DB] Direct REST upsert also failed:", restErr);
        throw new Error(`upsertSyncData: RLS policy blocks upserts. Please disable RLS on the 'user_sync_data' table.`);
      }
      console.log("[DB] Direct REST upsert succeeded for sync data");
      return;
    }
    throw new Error(error.message);
  }
}

async function getSyncData(userId: string): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("user_sync_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.log("[DB] getSyncData error:", error.message);
    return null;
  }
  return (data?.data as Record<string, unknown>) ?? null;
}

async function getAuthUser(c: { req: { header: (name: string) => string | undefined } }): Promise<StoredUser | null> {
  const auth = c.req.header("Authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token) return null;
  const userId = await findUserIdByToken(token);
  if (!userId) return null;
  return findUserById(userId);
}

app.get("/", async (c) => {
  const count = await getUserCount();
  return c.json({ status: "ok", service: "Lime API", users: count, storage: "supabase" });
});

app.get("/health", async (c) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from("users").select("id", { count: "exact", head: true });
    if (error) {
      console.log("[Health] Supabase error:", error.message, error.code, error.details, error.hint);
      return c.json({ status: "error", supabase: false, error: error.message, code: error.code, hint: error.hint });
    }
    return c.json({ status: "ok", supabase: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[Health] Error:", msg);
    return c.json({ status: "error", supabase: false, error: msg });
  }
});

app.post("/auth/register", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    console.log(`[Auth] Register attempt: email=${email}, name=${name}`);
    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return c.json({ error: "An account with this email already exists" }, 409);
    }

    const id = genId();
    const salt = genSalt();
    const passwordHash = await hashPwd(password, salt);
    const totalUsers = await getUserCount();
    const isAdmin = totalUsers === 0;

    const user: StoredUser = {
      id,
      email: email.toLowerCase().trim(),
      name,
      passwordHash,
      salt,
      isAdmin,
      createdAt: new Date().toISOString(),
    };
    console.log(`[Auth] Inserting user: ${id}`);
    await insertUser(user);
    console.log(`[Auth] User inserted, creating token`);

    const token = genToken();
    await insertToken(token, id);

    console.log(`[Auth] Registered: ${email} (admin: ${isAdmin})`);
    return c.json({ token, user: { id, email: user.email, name, isAdmin } });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log("[Auth] Register error:", errorMsg);
    return c.json({ error: `Registration failed: ${errorMsg}` }, 500);
  }
});

app.post("/auth/login", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let found = await findUserByEmail(normalizedEmail);

    if (!found) {
      if (name) {
        console.log(`[Auth] User ${normalizedEmail} not found, auto-registering (recovery)`);
        const id = genId();
        const salt = genSalt();
        const passwordHash = await hashPwd(password, salt);
        const totalUsers = await getUserCount();
        const isAdmin = totalUsers === 0;
        const user: StoredUser = {
          id,
          email: normalizedEmail,
          name,
          passwordHash,
          salt,
          isAdmin,
          createdAt: new Date().toISOString(),
        };
        await insertUser(user);
        const token = genToken();
        await insertToken(token, id);
        return c.json({ token, user: { id, email: normalizedEmail, name, isAdmin }, recovered: true });
      }
      console.log(`[Auth] Login failed: user ${normalizedEmail} not found`);
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const hash = await hashPwd(password, found.salt);
    if (hash !== found.passwordHash) {
      console.log(`[Auth] Login failed: password mismatch for ${normalizedEmail}`);
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = genToken();
    await insertToken(token, found.id);

    console.log(`[Auth] Login success: ${normalizedEmail}`);
    return c.json({
      token,
      user: { id: found.id, email: found.email, name: found.name, isAdmin: found.isAdmin },
    });
  } catch (err) {
    console.log("[Auth] Login error:", err);
    return c.json({ error: "Login failed" }, 500);
  }
});

app.post("/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const found = await findUserByEmail(email);
    if (!found) {
      console.log(`[Auth] Forgot password: user ${email} not found`);
      return c.json({ message: "If an account with that email exists, reset instructions have been sent." });
    }

    const resetToken = genToken().slice(0, 8).toUpperCase();
    found.resetToken = resetToken;
    found.resetTokenExpiry = Date.now() + 30 * 60 * 1000;
    await updateUser(found);

    console.log(`[Auth] Password reset requested for ${email}, code: ${resetToken}`);
    return c.json({ message: "If an account with that email exists, reset instructions have been sent.", resetCode: resetToken });
  } catch (err) {
    console.log("[Auth] Forgot password error:", err);
    return c.json({ error: "Request failed" }, 500);
  }
});

app.post("/auth/reset-password", async (c) => {
  try {
    const { email, resetCode, newPassword } = await c.req.json();
    if (!email || !resetCode || !newPassword) {
      return c.json({ error: "Email, reset code, and new password are required" }, 400);
    }
    if (newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    const found = await findUserByEmail(email);
    if (!found || !found.resetToken || !found.resetTokenExpiry) {
      return c.json({ error: "Invalid or expired reset code" }, 400);
    }

    if (found.resetToken !== resetCode.toUpperCase() || Date.now() > found.resetTokenExpiry) {
      return c.json({ error: "Invalid or expired reset code" }, 400);
    }

    const salt = genSalt();
    found.passwordHash = await hashPwd(newPassword, salt);
    found.salt = salt;
    found.resetToken = undefined;
    found.resetTokenExpiry = undefined;
    await updateUser(found);

    console.log(`[Auth] Password reset for ${email}`);
    return c.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.log("[Auth] Reset password error:", err);
    return c.json({ error: "Reset failed" }, 500);
  }
});

app.post("/sync", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const data = await c.req.json();
    const syncPayload = {
      ...data,
      _userId: user.id,
      _userName: user.name,
      _userEmail: user.email,
      _lastSync: new Date().toISOString(),
    };
    await upsertSyncData(user.id, syncPayload);
    console.log(`[Sync] Data received from ${user.email}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log("[Sync] Error:", err);
    return c.json({ error: "Sync failed" }, 500);
  }
});

app.get("/sync/get", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const data = await getSyncData(user.id);
  console.log(`[Sync] Data requested by ${user.email}, has data: ${!!data}`);
  return c.json({ data });
});

app.post("/auth/renew", async (c) => {
  try {
    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const found = await findUserById(userId);
    if (!found) {
      console.log(`[Auth] Renew failed: user ${userId} not found`);
      return c.json({ error: "User not found" }, 404);
    }

    const token = genToken();
    await insertToken(token, found.id);

    console.log(`[Auth] Token renewed for ${found.email}`);
    return c.json({
      token,
      user: { id: found.id, email: found.email, name: found.name, isAdmin: found.isAdmin },
    });
  } catch (err) {
    console.log("[Auth] Renew error:", err);
    return c.json({ error: "Token renewal failed" }, 500);
  }
});

app.get("/leaderboard", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const sb = getSupabase();
  const { data: allDbUsers, error: usersErr } = await sb
    .from("users")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (usersErr) {
    console.log("[Leaderboard] Error fetching users:", usersErr.message);
    return c.json({ error: "Failed to fetch users" }, 500);
  }

  const { data: allSyncData, error: syncErr } = await sb
    .from("user_sync_data")
    .select("user_id, data, updated_at");

  if (syncErr) {
    console.log("[Leaderboard] Error fetching sync data:", syncErr.message);
  }

  const syncMap = new Map<string, { data: Record<string, unknown>; updated_at: string }>();
  if (allSyncData) {
    for (const row of allSyncData) {
      syncMap.set(row.user_id, { data: row.data as Record<string, unknown>, updated_at: row.updated_at });
    }
  }

  const participants = (allDbUsers ?? []).map((row: { id: string; name: string; created_at: string }) => {
    const sync = syncMap.get(row.id);
    const data = sync?.data ?? {};
    const profile = (data.profile as Record<string, unknown> | null) ?? null;
    const mealLogs = (data.mealLogs as unknown[]) ?? [];
    const activityLogs = (data.activityLogs as unknown[]) ?? [];
    const sleepLogs = (data.sleepLogs as unknown[]) ?? [];
    const journalLogs = (data.journalLogs as unknown[]) ?? [];
    const badges = (data.badges as Array<{ earned: boolean }>) ?? [];
    return {
      id: row.id,
      name: (profile?.name as string) || row.name,
      teamName: (profile?.teamName as string) || null,
      totalPoints: (data.totalPoints as number) || 0,
      mealsLogged: mealLogs.length,
      activitiesLogged: activityLogs.length,
      sleepLogged: sleepLogs.length,
      journalsLogged: journalLogs.length,
      badgesEarned: badges.filter(b => b.earned).length,
      lastActive: sync?.updated_at ?? null,
      isSelf: row.id === user.id,
    };
  });

  return c.json({ participants, updatedAt: new Date().toISOString() });
});

app.get("/admin/users", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "Admin access required" }, 403);

  const sb = getSupabase();
  const { data: allDbUsers, error: usersErr } = await sb
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (usersErr) {
    console.log("[Admin] Error fetching users:", usersErr.message);
    return c.json({ error: "Failed to fetch users" }, 500);
  }

  const { data: allSyncData, error: syncErr } = await sb
    .from("user_sync_data")
    .select("user_id, data");

  if (syncErr) {
    console.log("[Admin] Error fetching sync data:", syncErr.message);
  }

  const syncMap = new Map<string, Record<string, unknown>>();
  if (allSyncData) {
    for (const row of allSyncData) {
      syncMap.set(row.user_id, row.data as Record<string, unknown>);
    }
  }

  const allUsers = (allDbUsers ?? []).map((row: DbUser) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    syncData: syncMap.get(row.id) ?? null,
    hasSynced: syncMap.has(row.id),
  }));

  return c.json({ users: allUsers, total: allUsers.length });
});

app.post("/admin/promote", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "Admin access required" }, 403);

  try {
    const { userId, isAdmin: makeAdmin } = await c.req.json();
    if (!userId) return c.json({ error: "userId is required" }, 400);

    const target = await findUserById(userId);
    if (!target) return c.json({ error: "User not found" }, 404);

    target.isAdmin = makeAdmin !== false;
    await updateUser(target);

    console.log(`[Admin] ${user.email} ${makeAdmin !== false ? "promoted" : "demoted"} ${target.email}`);
    return c.json({ ok: true, user: { id: target.id, email: target.email, name: target.name, isAdmin: target.isAdmin } });
  } catch (err) {
    console.log("[Admin] Promote error:", err);
    return c.json({ error: "Operation failed" }, 500);
  }
});

app.post("/admin/reset-user-password", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "Admin access required" }, 403);

  try {
    const { userId, newPassword } = await c.req.json();
    if (!userId || !newPassword) return c.json({ error: "userId and newPassword are required" }, 400);
    if (newPassword.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

    const target = await findUserById(userId);
    if (!target) return c.json({ error: "User not found" }, 404);

    const salt = genSalt();
    target.passwordHash = await hashPwd(newPassword, salt);
    target.salt = salt;
    target.resetToken = undefined;
    target.resetTokenExpiry = undefined;
    await updateUser(target);

    console.log(`[Admin] ${user.email} reset password for ${target.email}`);
    return c.json({ ok: true, message: `Password reset for ${target.email}` });
  } catch (err) {
    console.log("[Admin] Reset password error:", err);
    return c.json({ error: "Operation failed" }, 500);
  }
});

app.get("/admin/export", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "Admin access required" }, 403);

  const sb = getSupabase();
  const { data: allDbUsers } = await sb
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: allSyncData } = await sb
    .from("user_sync_data")
    .select("user_id, data");

  const syncMap = new Map<string, Record<string, unknown>>();
  if (allSyncData) {
    for (const row of allSyncData) {
      syncMap.set(row.user_id, row.data as Record<string, unknown>);
    }
  }

  const exportPayload = (allDbUsers ?? []).map((row: DbUser) => ({
    participant: { id: row.id, email: row.email, name: row.name, registeredAt: row.created_at, isAdmin: row.is_admin },
    healthData: syncMap.get(row.id) ?? null,
  }));

  return c.json({
    data: exportPayload,
    exportedAt: new Date().toISOString(),
    totalParticipants: exportPayload.length,
  });
});

export default app;
