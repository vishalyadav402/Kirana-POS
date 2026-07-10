"use client";

import { supabase } from "./supabase";
import { getDB } from "./db";
import { enqueue } from "./sync";

const generateId = () => crypto.randomUUID();

/* =========================================================
   PRODUCTS
========================================================= */

// Always read from IndexedDB (populated by syncAll on load)
// Falls back to Supabase if IndexedDB is empty (first load)
export const getProducts = async () => {
  const db = await getDB();
  const local = await db.getAll("products");

  if (local.length > 0) {
    // return active only, newest first
    return local
      .filter((p) => p.is_active)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // fallback: fetch from Supabase and cache
  if (navigator.onLine) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const tx = db.transaction("products", "readwrite");
      await Promise.all([...data.map((p) => tx.store.put(p)), tx.done]);
      return data;
    }
  }

  return [];
};

export const getProductById = async (id) => {
  const db = await getDB();
  const local = await db.get("products", id);
  if (local) return local;

  // fallback to Supabase
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  return data || null;
};

/* =========================================================
   CUSTOMERS
========================================================= */

export const getCustomers = async () => {
  const db = await getDB();
  return db.getAll("customers");
};

export const addCustomer = async (data) => {
  const db = await getDB();
  const record = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  // ✅ save locally first (works offline)
  await db.put("customers", record);

  if (navigator.onLine) {
    // direct insert so orders can reference customer_id immediately
    const { error } = await supabase.from("customers").insert([record]);
    if (error) {
      console.error("Supabase customer sync error:", error);
      // queue for retry
      await enqueue("insert", "customers", record, "id");
    }
  } else {
    // queue for when back online
    await enqueue("insert", "customers", record, "id");
  }

  return record;
};

export const updateCustomer = async (id, data) => {
  const db = await getDB();
  const existing = await db.get("customers", id);
  const updated = { ...existing, ...data, id };
  await db.put("customers", updated);
  await enqueue("update", "customers", updated, "id");
  return updated;
};

export const deleteCustomer = async (id) => {
  const db = await getDB();
  await db.delete("customers", id);
  await enqueue("delete", "customers", { id }, "id");
};

/* =========================================================
   ORDERS
========================================================= */

// Save a bill — locally first, queue Supabase sync
export const saveOrder = async (order) => {
  const db = await getDB();
  const record = {
    ...order,
    created_at: order.created_at || new Date().toISOString(),
  };

  // Always write locally first — this is the source of truth if offline
  await db.put("orders", record);

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from("orders")
      .upsert([record], { onConflict: "order_id" })
      .select();

    if (error) {
      console.error("Supabase order sync error:", error);
      // fall back to queue so it retries later instead of being lost
      await enqueue("insert", "orders", record, "order_id");
      return { record, synced: false, error };
    }

    return { record, synced: true, data };
  } else {
    await enqueue("insert", "orders", record, "order_id");
    return { record, synced: false, queued: true };
  }
};

// Get all POS orders (from IndexedDB)
export const getOrders = async () => {
  const db = await getDB();
  const all = await db.getAll("orders");
  // sort newest first
  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// Get orders for a specific customer
export const getOrdersByCustomer = async (customerId) => {
  const db = await getDB();
  const index = db
    .transaction("orders")
    .store.index("customer_id");
  const all = await index.getAll(customerId);
  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

/* =========================================================
   UDHAR PAYMENTS
========================================================= */

// Record a repayment — locally first, queue Supabase sync
export const saveUdharPayment = async (data) => {
  const db = await getDB();
  const record = {
    ...data,
    id: generateId(), // UUID, matches Supabase uuid pk
    paid_at: data.paid_at || new Date().toISOString(),
  };

  // ✅ save locally first
  await db.put("udharPayments", record);

  if (navigator.onLine) {
    const { error } = await supabase.from("udhar_payments").upsert([record], {
      onConflict: "id",
    });
    if (error) {
      console.error("Supabase udhar payment sync error:", error);
      await enqueue("insert", "udhar_payments", record, "id");
    }
  } else {
    await enqueue("insert", "udhar_payments", record, "id");
  }

  return record;
};

/* =========================================================
   MANUAL UDHAR (off-books credit given without a bill)
========================================================= */

// Record a manual udhar entry — locally first, queue Supabase sync
export const saveManualUdhar = async (data) => {
  const db = await getDB();
  const record = {
    ...data,
    id: generateId(),
    given_at: data.given_at || new Date().toISOString(),
  };

  await db.put("manualUdhar", record);

  if (navigator.onLine) {
    const { error } = await supabase.from("manual_udhar").upsert([record], {
      onConflict: "id",
    });
    if (error) {
      console.error("Supabase manual udhar sync error:", error);
      await enqueue("insert", "manual_udhar", record, "id");
    }
  } else {
    await enqueue("insert", "manual_udhar", record, "id");
  }

  return record;
};

// Get manual udhar entries for a specific customer
export const getManualUdharByCustomer = async (customerId) => {
  const db = await getDB();
  const index = db.transaction("manualUdhar").store.index("customer_id");
  const all = await index.getAll(customerId);
  return all.sort((a, b) => new Date(b.given_at) - new Date(a.given_at));
};

// Get all manual udhar entries (for ledger totals)
export const getAllManualUdhar = async () => {
  const db = await getDB();
  return db.getAll("manualUdhar");
};

// Get all repayments for a customer
export const getUdharPaymentsByCustomer = async (customerId) => {
  const db = await getDB();
  const index = db
    .transaction("udharPayments")
    .store.index("customer_id");
  const all = await index.getAll(customerId);
  return all.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
};

// Get all udhar payments (for ledger totals)
export const getAllUdharPayments = async () => {
  const db = await getDB();
  return db.getAll("udharPayments");
};

/* =========================================================
   CATEGORIES (unchanged — localStorage is fine here)
========================================================= */

const CATEGORY_KEY = "categories";

export const getCategories = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(CATEGORY_KEY)) || [];
};

export const saveCategory = (category) => {
  if (!category) return;
  const existing = getCategories();
  const alreadyExists = existing.find(
    (c) => c.name?.toLowerCase() === category.toLowerCase()
  );
  if (!alreadyExists) {
    const updated = [...existing, { id: Date.now(), name: category }];
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(updated));
  }
};


/* =========================================================
   LEDGER SYNC (pull latest before reading, when online)
========================================================= */

export const pullLedgerData = async () => {
  if (!navigator.onLine) return; // stay offline-safe, just read local as-is

  const db = await getDB();

  try {
    const [
      { data: customers },
      { data: orders },
      { data: udharPayments },
      { data: manualUdhar },
    ] = await Promise.all([
      supabase.from("customers").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("udhar_payments").select("*"),
      supabase.from("manual_udhar").select("*"),
    ]);

    const puts = [];
    if (customers) {
      const tx = db.transaction("customers", "readwrite");
      customers.forEach((c) => puts.push(tx.store.put(c)));
      puts.push(tx.done);
    }
    if (orders) {
      const tx = db.transaction("orders", "readwrite");
      orders.forEach((o) => puts.push(tx.store.put(o)));
      puts.push(tx.done);
    }
    if (udharPayments) {
      const tx = db.transaction("udharPayments", "readwrite");
      udharPayments.forEach((p) => puts.push(tx.store.put(p)));
      puts.push(tx.done);
    }
    if (manualUdhar) {
      const tx = db.transaction("manualUdhar", "readwrite");
      manualUdhar.forEach((m) => puts.push(tx.store.put(m)));
      puts.push(tx.done);
    }

    await Promise.all(puts);
  } catch (err) {
    console.error("Ledger pull sync error:", err);
    // fail silently — local (possibly stale) data still shown
  }
};