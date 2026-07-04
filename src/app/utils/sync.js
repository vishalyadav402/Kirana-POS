import { getDB } from "./db";
import { supabase } from "./supabase";

// ─── ENQUEUE ────────────────────────────────────────────
export const enqueue = async (action, table, data, keyField = "id") => {
  try {
    const db = await getDB();
    await db.add("syncQueue", {
      action,
      table,
      data,
      keyField,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Enqueue failed:", err);
  }
};

// ─── FLUSH QUEUE ────────────────────────────────────────
export const flushSyncQueue = async () => {
  if (!navigator.onLine) return;

  let db;
  try {
    db = await getDB();
  } catch (err) {
    console.error("DB not ready for flush:", err);
    return;
  }

  const queue = await db.getAll("syncQueue");
  if (!queue.length) return;

  for (const op of queue) {
    try {
      if (op.action === "insert" || op.action === "update") {
        await supabase
          .from(op.table)
          .upsert(op.data, { onConflict: op.keyField || "id" });
      } else if (op.action === "delete") {
        await supabase
          .from(op.table)
          .delete()
          .eq(op.keyField || "id", op.data.id);
      }
      await db.delete("syncQueue", op.id);
    } catch (err) {
      console.error("Sync failed for op:", op, err);
    }
  }
};

// ─── PULL FROM SUPABASE ─────────────────────────────────
export const pullFromSupabase = async (table, storeName, queryFn) => {
  if (!navigator.onLine) return;

  let db;
  try {
    db = await getDB();
  } catch (err) {
    console.error(`DB not ready, skipping pull for ${storeName}:`, err);
    return;
  }

  // ✅ verify the store exists before trying to use it
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Store "${storeName}" not found — skipping pull. Try refreshing.`);
    return;
  }

  try {
    let query = supabase.from(table).select("*");
    if (queryFn) query = queryFn(query);

    const { data, error } = await query;
    if (error || !data) return;

    const tx = db.transaction(storeName, "readwrite");
    await Promise.all([
      ...data.map((row) => tx.store.put(row)),
      tx.done,
    ]);
  } catch (err) {
    console.error(`Pull failed for ${storeName}:`, err);
  }
};

// ─── SYNC ALL ───────────────────────────────────────────
export const syncAll = async () => {
  if (!navigator.onLine) return;

  try {
    await flushSyncQueue();
  } catch (err) {
    console.error("Flush failed:", err);
  }

  // pull each table independently so one failure doesn't block others
  await pullFromSupabase("products", "products", (q) =>
    q.eq("is_active", true).order("created_at", { ascending: false })
  );
  await pullFromSupabase("customers", "customers");
  await pullFromSupabase("orders", "orders", (q) =>
    q.eq("address", "POS").order("created_at", { ascending: false })
  );
  await pullFromSupabase("udhar_payments", "udharPayments");

  console.log("✅ Sync complete");
};

// ─── PENDING COUNT ──────────────────────────────────────
export const getPendingCount = async () => {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("syncQueue")) return 0;
    return db.count("syncQueue");
  } catch {
    return 0;
  }
};