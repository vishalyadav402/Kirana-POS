"use client";
import { useState, useEffect } from "react";
import {
  getOrdersByCustomer,
  getUdharPaymentsByCustomer,
  saveUdharPayment,
  getManualUdharByCustomer, // ✅ new
  saveManualUdhar,          // ✅ new
} from "@/app/utils/storage";
import { toast } from "react-toastify";

export default function CustomerAccount({ customerId, name, address, phone, isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [manualUdhar, setManualUdhar] = useState([]); // ✅ new
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [udharAmount, setUdharAmount] = useState("");       // ✅ new
  const [udharComment, setUdharComment] = useState("");      // ✅ new
  const [showAddUdhar, setShowAddUdhar] = useState(false);   // ✅ new
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isOpen || !customerId) return;
    loadAccount();
  }, [isOpen, customerId]);

  // send udha ron whatsapp
 const openWhatsApp = (phoneNumber, message) => {
  if (!phoneNumber) {
    toast.warning("No mobile number saved for this customer");
    return;
  }
  let clean = phoneNumber.replace(/\D/g, "");
  if (clean.length === 10) clean = "91" + clean; // adjust country code if needed
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

const sendUdharReminder = () => {
  const msg = udharRemaining > 0
    ? `नमस्ते ${name}, आपका उधार बैलेंस रु${udharRemaining.toFixed(2)} है। कृपया  शीघ्र भुगतान करें। धन्यवाद! - किरानानीड्स स्टोर`
    : `नमस्ते ${name}, आपका कोई उधार बाकी नहीं है। सब क्लियर है ✅ - किरानानीड्स स्टोर`;
  openWhatsApp(phone, msg);
};
// -----------------------------



  const loadAccount = async () => {
    setLoading(true);
    const [orderData, paymentData, manualUdharData] = await Promise.all([
      getOrdersByCustomer(customerId),
      getUdharPaymentsByCustomer(customerId),
      getManualUdharByCustomer(customerId), // ✅ new
    ]);
    setOrders(orderData);
    setPayments(paymentData);
    setManualUdhar(manualUdharData); // ✅ new
    setLoading(false);
  };

  const calcBillProfit = (order) => {
    const gross = (order.items || []).reduce((sum, item) => {
      const cp = Number(item.cp || 0);
      if (cp <= 0) return sum; // ✅ skip items with no CP entered — don't count price as profit
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      return sum + (price - cp) * qty;
    }, 0);
    return gross - Number(order.discount || 0);
  };

  const totalOrders = orders.length;
  const totalBilled = orders.reduce(
    (sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0
  );
  const totalProfit = orders.reduce((sum, o) => sum + calcBillProfit(o), 0);
  const avgMargin = totalBilled > 0
    ? ((totalProfit / totalBilled) * 100).toFixed(1) : 0;
  const totalDiscounts = orders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
  const totalUdharGiven = orders
    .filter((o) => o.status === "udhar" || o.status === "split")
    .reduce((sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0);
  const totalManualUdharGiven = manualUdhar.reduce(
    (sum, m) => sum + Number(m.amount || 0), 0
  ); // ✅ new
  const totalUdharPaidBack = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const udharRemaining = totalUdharGiven + totalManualUdharGiven - totalUdharPaidBack; // ✅ updated

  const recordRepayment = async () => {
  if (!repayAmount || Number(repayAmount) <= 0) {
    toast.error("Enter a valid amount"); return;
  }
  await saveUdharPayment({
    customer_id: customerId,
    customer_phone: phone,
    customer_name: name,
    amount: Number(repayAmount),
    note: repayNote.trim() || null,
  });

  const newRemaining = udharRemaining - Number(repayAmount);
  const msg = `Namaste ${name}, aapne Rs.${Number(repayAmount).toFixed(2)} udhar chukaya hai. Baaki udhar: Rs.${newRemaining.toFixed(2)}. Dhanyawad! - KiranaNeeds Store`;
  openWhatsApp(phone, msg);

  toast.success("Payment recorded ✅");
  setRepayAmount(""); setRepayNote("");
  loadAccount();
};

  // ✅ new — record off-books udhar given
 const recordManualUdhar = async () => {
  if (!udharAmount || Number(udharAmount) <= 0) {
    toast.error("Enter a valid amount"); return;
  }
  await saveManualUdhar({
    customer_id: customerId,
    customer_phone: phone,
    customer_name: name,
    amount: Number(udharAmount),
    comment: udharComment.trim() || "Cash given",
  });

  const newRemaining = udharRemaining + Number(udharAmount);
  const msg = `Namaste ${name}, aapko Rs.${Number(udharAmount).toFixed(2)} udhar diya gaya hai (${udharComment.trim() || "Cash given"}). Baaki udhar: Rs.${newRemaining.toFixed(2)}. - KiranaNeeds Store`;
  openWhatsApp(phone, msg);

  toast.success("Udhar recorded ✅");
  setUdharAmount(""); setUdharComment("");
  setShowAddUdhar(false);
  loadAccount();
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">

        {/* HEADER */}
        <div className="bg-purple-600 text-white px-5 py-4 rounded-t-2xl flex items-start justify-between">
          <div>
            <p className="font-bold text-lg leading-tight capitalize">{name} {address}</p>
            {phone && <p className="text-purple-200 text-sm mt-0.5">{phone}</p>}
          </div>
          <button onClick={onClose}
            className="text-purple-200 hover:text-white text-xl leading-none mt-0.5">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-10">
            Loading...
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Total Orders</p>
                <p className="md:text-2xl text-md font-bold text-purple-700">{totalOrders}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Total Billed</p>
                <p className="md:text-2xl text-md font-bold text-green-700">₹{totalBilled.toFixed(0)}</p>
                {totalDiscounts > 0 && (
                  <p className="text-[10px] text-gray-400">₹{totalDiscounts.toFixed(0)} saved</p>
                )}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Your Profit</p>
                <p className={`md:text-2xl text-md font-bold ${totalProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
                  ₹{totalProfit.toFixed(0)}
                </p>
                <p className="text-[10px] text-gray-400">{avgMargin}% margin</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${udharRemaining > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-xs text-gray-400">Udhar Left</p>
                <p className={`md:text-2xl text-md font-bold ${udharRemaining > 0 ? "text-red-500" : "text-green-600"}`}>
                  ₹{udharRemaining.toFixed(0)}
                </p>
               
                {udharRemaining <= 0 && (
                  <p className="text-[10px] text-green-500">All clear ✅</p>
                )}
              </div>
            </div>
             {/* ✅ Send udhar balance on WhatsApp, anytime, on demand */}
                  <div className="px-5 pt-1">
                    <button onClick={sendUdharReminder}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                      📩 Send Udhar Reminder on Whatsapp
                    </button>
                  </div>

            {/* ✅ ADD UDHAR + REPAY SECTION */}
            <div className="px-5 py-3 border-b bg-white space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-orange-700">
                  💰 Udhar Actions
                </p>
                <button onClick={() => setShowAddUdhar(!showAddUdhar)}
                  className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg font-medium">
                  {showAddUdhar ? "Cancel" : "+ Add Udhar"}
                </button>
              </div>

              {showAddUdhar && (
                <div className="bg-white rounded-lg p-3 border border-orange-200 space-y-2">
                  <p className="text-[11px] text-gray-400">
                    For cash/items given without a bill (not recorded in POS)
                  </p>
                  <div className="flex gap-2">
                    <input type="number" value={udharAmount}
                      onChange={(e) => setUdharAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <button onClick={recordManualUdhar}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Add
                    </button>
                  </div>
                  <input type="text" value={udharComment}
                    onChange={(e) => setUdharComment(e.target.value)}
                    placeholder="Comment (e.g. Cash given, Sugar given)"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {udharRemaining > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 mb-2">
                    Record Repayment (₹{udharRemaining.toFixed(0)} remaining)
                  </p>
                  <input type="text" value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                    placeholder="Note (optional, e.g. paid via UPI)"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <div className="flex gap-2 mt-2">
                    <input type="number" value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <button onClick={recordRepayment}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Record
                    </button>
                  </div>
                  
                </div>
              )}
            </div>

            {/* TABS */}
            <div className="flex border-b">
              {["overview", "orders", "udhar", "repayments"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-purple-600 text-purple-600"
                      : "text-gray-400"
                  }`}>
                  {tab === "orders" ? `Orders (${totalOrders})` :
                   tab === "udhar" ? `Udhar (${manualUdhar.length})` :
                   tab === "repayments" ? `Repayments (${payments.length})` :
                   "Overview"}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto px-5 py-3">

              {activeTab === "overview" && (
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Total Billed", value: `₹${totalBilled.toFixed(2)}`, color: "text-gray-800" },
                    { label: "Total Profit from Customer", value: `₹${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? "text-blue-600" : "text-red-500" },
                    { label: "Avg Profit Margin", value: `${avgMargin}%`, color: "text-blue-500" },
                    { label: "Total Discounts Given", value: `₹${totalDiscounts.toFixed(2)}`, color: "text-red-400" },
                    { label: "Udhar from Bills", value: `₹${totalUdharGiven.toFixed(2)}`, color: "text-orange-600" },
                    { label: "Udhar Given Manually", value: `₹${totalManualUdharGiven.toFixed(2)}`, color: "text-orange-600" }, // ✅ new
                    { label: "Total Paid Back", value: `₹${totalUdharPaidBack.toFixed(2)}`, color: "text-green-600" },
                    { label: "Udhar Remaining", value: `₹${udharRemaining.toFixed(2)}`, color: udharRemaining > 0 ? "text-red-500" : "text-green-600" },
                    { label: "Completed Orders", value: orders.filter(o => o.status === "completed").length, color: "text-gray-800" },
                    { label: "Udhar Orders", value: orders.filter(o => o.status === "udhar").length, color: "text-orange-500" },
                    { label: "Split Orders", value: orders.filter(o => o.status === "split").length, color: "text-blue-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-semibold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "orders" && (
                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
                  ) : orders.map((o) => {
                    const net = Number(o.total || 0) - Number(o.discount || 0);
                    const profit = calcBillProfit(o);
                    const date = new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    });
                    return (
                      <div key={o.order_id} className="border rounded-lg px-3 py-2 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{o.order_id}</p>
                            <p className="text-xs text-gray-400">{date}</p>
                            {o.items?.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {o.items.map(i => i.name).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-700">₹{net.toFixed(0)}</p>
                            {Number(o.discount) > 0 && (
                              <p className="text-xs text-red-400 line-through">₹{o.total}</p>
                            )}
                            <p className={`text-xs font-medium ${profit >= 0 ? "text-blue-600" : "text-red-500"}`}>
                              {profit >= 0 ? "+" : ""}₹{profit.toFixed(0)} profit
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              o.status === "udhar" ? "bg-orange-100 text-orange-600" :
                              o.status === "split" ? "bg-blue-100 text-blue-600" :
                              "bg-green-100 text-green-700"
                            }`}>{o.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ✅ new tab */}
              {activeTab === "udhar" && (
                <div className="space-y-2">
                  {manualUdhar.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      No manual udhar recorded
                    </p>
                  ) : manualUdhar.map((m) => (
                    <div key={m.id}
                      className="border rounded-lg px-3 py-2 text-sm flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(m.given_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{m.comment}</p>
                      </div>
                      <p className="font-bold text-orange-600">+₹{Number(m.amount).toFixed(2)}</p>
                    </div>
                  ))}
                  {manualUdhar.length > 0 && (
                    <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                      <span>Total Manual Udhar</span>
                      <span className="text-orange-600">₹{totalManualUdharGiven.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "repayments" && (
                <div className="space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      No repayments recorded yet
                    </p>
                  ) : payments.map((p) => (
                    <div key={p.id}
                      className="border rounded-lg px-3 py-2 text-sm flex justify-between items-center">
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
                  ))}
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