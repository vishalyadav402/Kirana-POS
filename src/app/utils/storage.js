"use client";

/* =========================
   PRODUCTS STORAGE
========================= */

import { supabase } from "./supabase";

// ✅ Fetch all active products from Supabase
export const getProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch products:", error.message);
    return [];
  }

  return data || [];
};

// ✅ Fetch single product by id
export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
};
/* =========================
   CUSTOMERS STORAGE
========================= */

// const CUSTOMERS_KEY = "customers";/

import { getDB } from "./db";
import { enqueue } from "./sync";

const generateId = () => crypto.randomUUID();

// ─── CUSTOMERS ───────────────────────────────────────────

export const getCustomers = async () => {
  const db = await getDB();
  return db.getAll("customers");
};

// utils/storage.js

export const addCustomer = async (data) => {
  const db = await getDB();
  const record = { ...data, id: generateId(), created_at: new Date().toISOString() };
  await db.put("customers", record);
  await enqueue("insert", "customers", record);

  // ✅ also write directly to Supabase so orders can reference it immediately
  const { error } = await supabase.from("customers").insert([record]);
  if (error) console.error("Supabase customer sync error:", error);

  return record;
};

export const updateCustomer = async (id, data) => {
  const db = await getDB();
  const existing = await db.get("customers", id);
  const updated = { ...existing, ...data, id };
  await db.put("customers", updated);
  await enqueue("update", "customers", updated);
  return updated;
};

export const deleteCustomer = async (id) => {
  const db = await getDB();
  await db.delete("customers", id);
  await enqueue("delete", "customers", { id });
};

/* =========================
   CATEGORY STORAGE
========================= */

const CATEGORY_KEY = "categories";

export const getCategories = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(CATEGORY_KEY)) || [];
};

export const saveCategory = (category) => {
  if (!category) return;

  const existing = getCategories();

  // 🔥 prevent duplicate
  const alreadyExists = existing.find(
    (c) => c.name?.toLowerCase() === category.toLowerCase()
  );

  if (!alreadyExists) {
    const newCategory = {
      id: Date.now(),
      name: category,
    };

    const updated = [...existing, newCategory];

    localStorage.setItem(CATEGORY_KEY, JSON.stringify(updated));

    // ✅ Sync only new category
  }
};