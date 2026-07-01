"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/utils/supabase";
import { toast } from "react-toastify";

export default function CustomerAccount({ customerId, name, phone, isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | orders | repayments

  useEffect(() => {
    if (!isOpen || !customerId) return;
    loadAccount();
  }, [isOpen, customerId]);

  const loadAccount = async () => {
    setLoading(true);
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    const { data: paymentData } = await supabase
      .from("udhar_payments")
      .select("*")
      .eq("customer_id", customerId)
      .order("paid_at", { ascending: false });

    setOrders(orderData || []);
    setPayments(paymentData || []);
    setLoading(false);
  };

  // ─── STATS ──────────────────────────────────────────────
  const totalOrders = orders.length;
  const totalBilled = orders.reduce(
    (sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0
  );
  const totalUdharGiven = orders
    .filter((o) => o.status === "udhar" || o.status === "split")
    .reduce((sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0);
  const totalUdharPaidBack = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const udharRemaining = totalUdharGiven - totalUdharPaidBack;
  const totalDiscounts = orders.reduce((sum, o) => sum + Number(o.discount || 0), 0);

  const recordRepayment = async () => {
    if (!repayAmount || Number(repayAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await supabase.from("udhar_payments").insert([{
      customer_id: customerId,
      customer_phone: phone,
      customer_name: name,
      amount: Number(repayAmount),
      note: repayNote.trim() || null,
    }]);
    if (error) { toast.error("Failed to record payment"); return; }
    toast.success("Payment recorded ✅");
    setRepayAmount("");
    setRepayNote("");
    loadAccount();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">

        {/* ─── HEADER ─── */}
        <div className="bg-purple-600 text-white px-5 py-4 rounded-t-2xl flex items-start justify-between">
          <div>
            <p className="font-bold text-lg leading-tight">{name}</p>
            {phone && <p className="text-purple-200 text-sm mt-0.5">{phone}</p>}
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white text-xl leading-none mt-0.5">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-10">
            Loading...
          </div>
        ) : (
          <>
            {/* ─── STAT CARDS ─── */}
            <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-purple-700">{totalOrders}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Total Billed</p>
                <p className="text-2xl font-bold text-green-700">₹{totalBilled.toFixed(0)}</p>
                {totalDiscounts > 0 && (
                  <p className="text-[10px] text-gray-400">₹{totalDiscounts.toFixed(0)} saved</p>
                )}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Paid Back</p>
                <p className="text-2xl font-bold text-blue-600">₹{totalUdharPaidBack.toFixed(0)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${udharRemaining > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-xs text-gray-400">Udhar Left</p>
                <p className={`text-2xl font-bold ${udharRemaining > 0 ? "text-red-500" : "text-green-600"}`}>
                  ₹{udharRemaining.toFixed(0)}
                </p>
                {udharRemaining <= 0 && <p className="text-[10px] text-green-500">All clear ✅</p>}
              </div>
            </div>

            {/* ─── REPAY SECTION ─── */}
            {udharRemaining > 0 && (
              <div className="px-5 py-3 border-b bg-orange-50">
                <p className="text-xs font-semibold text-orange-700 mb-2">
                  💰 Record Udhar Payment (₹{udharRemaining.toFixed(0)} remaining)
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={recordRepayment}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Record
                  </button>
                </div>
                <input
                  type="text"
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  placeholder="Note (optional, e.g. paid via UPI)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* ─── TABS ─── */}
            <div className="flex border-b">
              {["overview", "orders", "repayments"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-purple-600 text-purple-600"
                      : "text-gray-400"
                  }`}
                >
                  {tab === "orders" ? `Orders (${totalOrders})` :
                   tab === "repayments" ? `Repayments (${payments.length})` :
                   "Overview"}
                </button>
              ))}
            </div>

            {/* ─── TAB CONTENT ─── */}
            <div className="flex-1 overflow-y-auto px-5 py-3">

              {/* Overview */}
              {activeTab === "overview" && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Total Udhar Given</span>
                    <span className="font-medium text-orange-600">₹{totalUdharGiven.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Total Paid Back</span>
                    <span className="font-medium text-green-600">₹{totalUdharPaidBack.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Udhar Remaining</span>
                    <span className={`font-bold ${udharRemaining > 0 ? "text-red-500" : "text-green-600"}`}>
                      ₹{udharRemaining.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Total Discounts Given</span>
                    <span className="font-medium text-red-400">₹{totalDiscounts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Completed Orders</span>
                    <span className="font-medium">{orders.filter(o => o.status === "completed").length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Udhar Orders</span>
                    <span className="font-medium text-orange-500">{orders.filter(o => o.status === "udhar").length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Split Orders</span>
                    <span className="font-medium text-blue-500">{orders.filter(o => o.status === "split").length}</span>
                  </div>
                </div>
              )}

              {/* Orders */}
              {activeTab === "orders" && (
                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
                  ) : (
                    orders.map((o) => {
                      const net = Number(o.total || 0) - Number(o.discount || 0);
                      const date = new Date(o.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      });
                      return (
                        <div key={o.order_id} className="border rounded-lg px-3 py-2 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{o.order_id}</p>
                              <p className="text-xs text-gray-400">{date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-700">₹{net.toFixed(2)}</p>
                              {Number(o.discount) > 0 && (
                                <p className="text-xs text-red-400 line-through">₹{o.total}</p>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                o.status === "udhar" ? "bg-orange-100 text-orange-600" :
                                o.status === "split" ? "bg-blue-100 text-blue-600" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {o.status}
                              </span>
                            </div>
                          </div>
                          {o.items?.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {o.items.map(i => i.name).join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Repayments */}
              {activeTab === "repayments" && (
                <div className="space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No repayments recorded yet</p>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="border rounded-lg px-3 py-2 text-sm flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-400">
                            {new Date(p.paid_at).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </p>
                          {p.note && <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>}
                        </div>
                        <p className="font-bold text-green-600">+₹{Number(p.amount).toFixed(2)}</p>
                      </div>
                    ))
                  )}
                  {payments.length > 0 && (
                    <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                      <span>Total Paid Back</span>
                      <span className="text-green-600">₹{totalUdharPaidBack.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
