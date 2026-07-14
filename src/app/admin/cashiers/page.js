"use client";
import { supabase } from "@/app/utils/supabase";
import { useState, useEffect } from "react";

export default function CashiersPage() {
  const [cashiers, setCashiers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", pin: "", role: "cashier", is_active: true });

  const fetchCashiers = async () => {
    setFetching(true);
    const { data } = await supabase.from("cashiers").select("*").order("created_at", { ascending: true });
    setCashiers(data || []);
    setFetching(false);
  };

  useEffect(() => { fetchCashiers(); }, []);

  const resetForm = () => {
    setForm({ name: "", pin: "", role: "cashier", is_active: true });
    setEditId(null);
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, pin: c.pin, role: c.role, is_active: c.is_active });
    setEditId(c.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Enter cashier name");
    if (!/^\d{4}$/.test(form.pin)) return alert("PIN must be exactly 4 digits");

    setLoading(true);
    setMessage("");

    const payload = {
      name: form.name.trim(),
      pin: form.pin,
      role: form.role,
      is_active: form.is_active,
    };

    try {
      let error;
      if (editId) {
        ({ error } = await supabase.from("cashiers").update(payload).eq("id", editId));
      } else {
        ({ error } = await supabase.from("cashiers").insert([payload]));
      }

      if (error) {
        // unique constraint violation on active PIN
        if (error.message?.includes("cashiers_active_pin_unique")) {
          setMessage("❌ This PIN is already used by another active cashier");
        } else {
          setMessage("❌ " + (error.message || "Something went wrong"));
        }
        return;
      }

      setMessage(editId ? "✅ Cashier updated" : "✅ Cashier added");
      fetchCashiers();
      resetForm();
      setShowModal(false);
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from("cashiers").delete().eq("id", id);
    setDeleteConfirmId(null);
    fetchCashiers();
  };

  const toggleActive = async (c) => {
    await supabase.from("cashiers").update({ is_active: !c.is_active }).eq("id", c.id);
    fetchCashiers();
  };

  return (
    <>
      <div className="md:p-6 mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">👤 Cashiers</h1>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            + Add Cashier
          </button>
        </div>

        <div className="space-y-2">
          {fetching ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border rounded-lg p-3 h-16" />
            ))
          ) : cashiers.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No cashiers added yet</div>
          ) : (
            cashiers.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div>
                  <p className="font-medium text-sm">
                    {c.name}
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      c.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.role}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">PIN: {c.pin}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => toggleActive(c)}
                    className={`text-xs px-2 py-1 rounded ${c.is_active ? "bg-green-500 text-white" : "bg-gray-400 text-white"}`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => handleEdit(c)} className="text-blue-500 text-sm underline">Edit</button>
                  <button onClick={() => setDeleteConfirmId(c.id)} className="text-red-500 text-sm underline">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ADD/EDIT MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-white w-full max-w-sm p-6 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">{editId ? "Update Cashier" : "Add Cashier"}</h2>
                <button onClick={() => setShowModal(false)}>✖</button>
              </div>

              <input
                placeholder="Cashier Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="p-2 w-full border mt-2 text-black rounded"
              />

              <input
                placeholder="4-digit PIN"
                inputMode="numeric"
                maxLength={4}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                className="p-2 w-full border mt-2 text-black rounded font-mono tracking-widest"
              />

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="p-2 w-full border mt-2 text-black rounded"
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex items-center justify-between mt-3">
                <label className="font-medium text-sm">Active</label>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  className={`px-4 py-1 rounded-full text-white text-sm ${form.is_active ? "bg-green-500" : "bg-gray-400"}`}
                >
                  {form.is_active ? "Yes" : "No"}
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className={`px-4 py-2 rounded text-white flex-1 ${loading ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"}`}
                >
                  {loading ? "Saving..." : editId ? "Update" : "Add"}
                </button>
                {editId && (
                  <button onClick={() => { resetForm(); setShowModal(false); }} className="bg-gray-300 px-4 py-2 rounded">
                    Cancel
                  </button>
                )}
              </div>

              {message && (
                <div className="my-2 text-center text-sm font-medium text-purple-600">{message}</div>
              )}
            </div>
          </div>
        )}

        {/* DELETE CONFIRM */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl">
              <div className="text-center">
                <div className="text-4xl mb-3">🗑️</div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Delete Cashier?</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Their past orders will keep their name on record, but they won't be able to log in anymore.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}