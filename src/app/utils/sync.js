import { getDB } from "./db";
import { supabase } from "./supabase";

// Push all queued operations to Supabase
export const flushSyncQueue = async () => {
  if (!navigator.onLine) return;

  const db = await getDB();
  const queue = await db.getAll("syncQueue");
  if (!queue.length) return;

  for (const op of queue) {
    try {
      if (op.action === "insert") {
        await supabase.from(op.table).upsert(op.data);
      } else if (op.action === "update") {
        await supabase.from(op.table).update(op.data).eq("id", op.data.id);
      } else if (op.action === "delete") {
        await supabase.from(op.table).delete().eq("id", op.id);
      }
      // Remove from queue after successful sync
      await db.delete("syncQueue", op.id);
    } catch (err) {
      console.error("Sync failed for op:", op, err);
    }
  }
};

// Add an operation to the sync queue
export const enqueue = async (action, table, data) => {
  const db = await getDB();
  await db.add("syncQueue", { action, table, data, timestamp: Date.now() });
};

// Pull latest data from Supabase into IndexedDB (called on app load when online)
export const pullFromSupabase = async (table) => {
  if (!navigator.onLine) return;
  const db = await getDB();
  const { data, error } = await supabase.from(table).select("*");
  if (error || !data) return;

  const tx = db.transaction(table, "readwrite");
  await Promise.all([
    ...data.map((row) => tx.store.put(row)),
    tx.done,
  ]);
};