"use client";
import { useEffect, useState } from "react";
import { getBills } from "@/app/utils/billingStorage";

export default function DashboardPage() {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    setBills(getBills());
  }, []);

  const today = new Date();

  const todaySales = bills
    .filter((b) => new Date(b.date).toDateString() === today.toDateString())
    .reduce((sum, b) => sum + Number(b.total), 0);

  const monthSales = bills
    .filter(
      (b) =>
        new Date(b.date).getMonth() === today.getMonth() &&
        new Date(b.date).getFullYear() === today.getFullYear()
    )
    .reduce((sum, b) => sum + Number(b.total), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📊 Sales Dashboard</h1>

      {/* STAT CARDS */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded">
          <h2>Today Sales</h2>
          <p className="text-2xl font-bold">₹{todaySales}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2>This Month</h2>
          <p className="text-2xl font-bold">₹{monthSales}</p>
        </div>

        <div className="bg-purple-100 p-4 rounded">
          <h2>Total Orders</h2>
          <p className="text-2xl font-bold">{bills.length}</p>
        </div>
      </div>

      {/* ORDER LIST */}
      <h2 className="text-xl font-bold mb-3">🧾 Order History</h2>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Bill ID</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Customer</th>
              <th className="border p-2">Items</th>
              <th className="border p-2">Payment</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">View</th>
            </tr>
          </thead>

          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td className="border p-2">{b.id}</td>
                <td className="border p-2">
                  {new Date(b.date).toLocaleString()}
                </td>
                <td className="border p-2">{b.customerName}</td>
                <td className="border p-2">{b.items.length}</td>
                <td className="border p-2">{b.paymentMode}</td>
                <td className="border p-2 font-bold">₹{b.total}</td>
                <td className="border p-2">
                  <button
                    onClick={() => setSelectedBill(b)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BILL DETAILS MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[600px]">
            <h2 className="text-xl font-bold mb-4">
              Bill #{selectedBill.id}
            </h2>

            <p><b>Date:</b> {new Date(selectedBill.date).toLocaleString()}</p>
            <p><b>Customer:</b> {selectedBill.customerName}</p>
            <p><b>Mobile:</b> {selectedBill.customerMobile}</p>
            <p><b>Payment:</b> {selectedBill.paymentMode}</p>

            <h3 className="font-bold mt-4 mb-2">Items</h3>
            <table className="w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Product</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Price</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items.map((item, i) => (
                  <tr key={i}>
                    <td className="border p-2">{item.name}</td>
                    <td className="border p-2">{item.qty}</td>
                    <td className="border p-2">₹{item.price}</td>
                    <td className="border p-2">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-right mt-4 text-xl font-bold">
              Grand Total ₹{selectedBill.total}
            </h3>

            <div className="text-right mt-4">
              <button
                onClick={() => setSelectedBill(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
