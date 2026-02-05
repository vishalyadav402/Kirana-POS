"use client";
import { useEffect, useState } from "react";
import {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer
} from "@/app/utils/storage";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: ""
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    console.log(getCustomers);
    setCustomers(await getCustomers());
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
  };

  const handleEdit = (customer) => {
    setForm({
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address || ""
    });
    setEditId(customer.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    await deleteCustomer(id);
    loadCustomers();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">👤 Customers</h1>

      {/* Form */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
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
          className="border p-2 rounded"
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
            }}
            className="px-4 py-2 rounded bg-gray-500 text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Table */}
      <table className="w-full border">
        <thead className="bg-gray-100">
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
  );
}
