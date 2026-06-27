"use client";
import { useEffect, useState, useRef } from "react";
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

  const saveCustomer = async () => {
    if (!form.name || !form.mobile) {
      alert("Name & Mobile required");
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
    // ✅ re-focus after save
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
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            ref={nameInputRef} // ✅ attached here
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border capitalize p-2 rounded"
          />
          <input
            placeholder="Mobile"
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