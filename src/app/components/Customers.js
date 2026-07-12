"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer
} from "@/app/utils/storage";

const Customers = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });
  const [editId, setEditId] = useState(null);

  const nameInputRef = useRef(null); // ✅ ref for name input

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      // ✅ focus name input when modal opens
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    const data = await getCustomers();
    setCustomers((data || []).reverse());
  };

  const nameOrMobileMatches = useMemo(() => {
    if (editId) return []; // don't warn while editing an existing customer
    const query = form.name.trim().toLowerCase();
    const mobileQuery = form.mobile.trim();
    if (!query && !mobileQuery) return [];

    return customers
      .filter((c) => {
        const nameMatch = query && c.name?.toLowerCase().includes(query);
        const mobileMatch = mobileQuery.length >= 4 && c.mobile?.includes(mobileQuery);
        return nameMatch || mobileMatch;
      })
      .slice(0, 5);
  }, [form.name, form.mobile, customers, editId]);

  const saveCustomer = async () => {
    if (!form.name.trim()) {
      alert("Name required");
      return;
    }
    if (editId) {
      await updateCustomer(editId, form);
      setEditId(null);
    } else {
      await addCustomer(form);
    }
    setForm({ name: "", mobile: "", address: "" });
    loadCustomers();
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleEdit = (customer) => {
    setForm({
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address || ""
    });
    setEditId(customer.id);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    await deleteCustomer(id);
    loadCustomers();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[900px] bg-black/80 max-h-[85vh] border-2 overflow-y-auto rounded-xl p-6 relative shadow-2xl">

        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl font-bold text-gray-600 hover:text-red-600"
        >
          ✖
        </button>

        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">👤 Customers</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}>
            {isOnline ? "🟢 Online" : "🔴 Offline"}
          </span>
        </div>

        {/* Form */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            <input
              ref={nameInputRef}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border capitalize p-2 rounded"
            />
           
            <input
              placeholder="Mobile (optional)"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border capitalize p-2 rounded"
            />
          </div>

          {nameOrMobileMatches.length > 0 && (
            <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-md p-2">
              <p className="text-xs font-semibold text-yellow-700 mb-1">
                ⚠️ Possible existing customer{nameOrMobileMatches.length > 1 ? "s" : ""} found
              </p>
              <div className="space-y-1">
                {nameOrMobileMatches.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleEdit(c)}
                    className="flex items-center justify-between bg-white text-gray-700 border rounded px-2 py-1 cursor-pointer hover:bg-yellow-100 text-xs"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-500">{c.mobile}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Tap a match to edit their record instead of creating a duplicate.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={saveCustomer}
            className={`px-4 py-2 rounded text-white ${
              editId ? "bg-yellow-600" : "bg-blue-600"
            }`}
          >
            {editId ? "Update Customer" : "Add Customer"}
          </button>
          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                setForm({ name: "", mobile: "", address: "" });
                setTimeout(() => nameInputRef.current?.focus(), 100);
              }}
              className="px-4 py-2 rounded bg-gray-500 text-white"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Table */}
        <table className="w-full border text-sm">
          <thead className="bg-gray-600">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Mobile</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="border p-2">{c.name}</td>
                <td className="border p-2">{c.mobile}</td>
                <td className="border p-2">{c.address}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleEdit(c)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
};

export default Customers;