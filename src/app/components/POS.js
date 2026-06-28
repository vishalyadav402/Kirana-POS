"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getProducts } from "../utils/storage";
import { useRouter } from "next/navigation";
import { MdElectricBolt } from "react-icons/md";
import { saveBill } from "../utils/billingStorage";
import { getCustomers, addCustomer } from "../utils/storage";
import { toast } from "react-toastify";
import Customers from "./Customers";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { CiBarcode } from "react-icons/ci";
import { MdClose } from "react-icons/md";

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);
  const [udharAmount, setUdharAmount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickItem, setQuickItem] = useState({ name: "", price: "" });
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [activeTab, setActiveTab] = useState("cart"); // ✅ mobile tab
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  const inputRef = useRef(null);
  const customerInputRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  const quickItemRef = useRef(null);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const router = useRouter();

  useEffect(() => setHighlightedCustomerIndex(0), [customerName]);

  useEffect(() => {
    if (!showScanner) return;
    const codeReader = new BrowserMultiFormatReader();
    const startScanner = async () => {
      try {
        controlsRef.current = await codeReader.decodeFromVideoDevice(
          null, videoRef.current,
          (result) => {
            if (result) {
              const scannedCode = result.getText();
              const matched = products.find(
                (p) => p.barcode === scannedCode || p.slug === scannedCode
              );
              if (matched) {
                const defaultVariant = matched.variants?.[0];
                const price = Number(defaultVariant?.price || 0);
                const label = defaultVariant?.label || "Default";
                setCart((prev) => [...prev, { ...matched, selectedVariant: label, price, qty: 1, total: price }]);
                toast.success(`✅ ${matched.name} added`);
              } else {
                setSearch(scannedCode);
                toast.warning("Product not found — showing search results");
              }
              setShowScanner(false);
            }
          }
        );
      } catch (err) {
        toast.error("Camera access denied or not available");
        setShowScanner(false);
      }
    };
    startScanner();
    return () => { controlsRef.current?.stop(); controlsRef.current = null; };
  }, [showScanner, products]);

  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(customerName.toLowerCase())
  );
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );
  const flatSuggestions = filteredProducts.flatMap((p) =>
    (p.variants || []).map((variant) => ({ p, variant }))
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (showQuickItemModal) setTimeout(() => quickItemRef.current?.focus(), 100); }, [showQuickItemModal]);
  useEffect(() => { setHighlightedIndex(0); }, [search]);
  useEffect(() => {
    const loadCustomers = async () => { const data = await getCustomers(); setCustomers(data || []); };
    loadCustomers();
  }, []);
  useEffect(() => {
    const loadProducts = async () => { const data = await getProducts(); setProducts(data || []); };
    loadProducts();
  }, []);
  useEffect(() => {
    const savedCart = localStorage.getItem("posCart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);
  useEffect(() => { localStorage.setItem("posCart", JSON.stringify(cart)); }, [cart]);

  const addToCart = (product) => {
    const defaultVariant = product.variants?.[0];
    const price = Number(defaultVariant?.price || 0);
    const label = defaultVariant?.label || "Default";
    setCart((prev) => [...prev, { ...product, selectedVariant: label, price, qty: 1, total: price }]);
  };

  const updateQty = (index, qty) => {
    const updatedCart = [...cart];
    const price = Number(updatedCart[index].price);
    updatedCart[index].qty = qty;
    updatedCart[index].total = qty * price;
    setCart(updatedCart);
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
  const getTotal = () => cart.reduce((sum, i) => sum + i.total, 0);

  const addQuickItemToCart = () => {
    if (!quickItem.name.trim() || !quickItem.price) { toast.error("Enter item name & price"); return; }
    const price = Number(quickItem.price);
    setCart((prev) => [...prev, { name: quickItem.name, price, selectedVariant: "Custom", qty: 1, total: price, id: "quick_" + Date.now() }]);
    setQuickItem({ name: "", price: "" });
    setShowQuickItemModal(false);
    toast.success("Item added ✅");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const saveNewCustomer = async () => {
    if (!customerName.trim()) { toast.error("Enter customer name"); return; }
    await addCustomer({ name: customerName.trim(), mobile: customerMobile ? customerMobile.trim() : "" });
    const updated = await getCustomers();
    setCustomers(updated || []);
    setCustomerName("");
    setCustomerMobile("");
    setShowAddCustomerModal(false);
    toast.success("Customer added ✅");
  };

  const handlePaymentCalculation = (value) => {
    const total = getTotal();
    if (value === "") { setPaidAmount(""); setChangeAmount(0); setUdharAmount(0); return; }
    const paid = Number(value);
    setPaidAmount(paid);
    if (paid >= total) { setChangeAmount(paid - total); setUdharAmount(0); }
    else { setChangeAmount(0); setUdharAmount(total - paid); }
  };

  const generateInvoice = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 200] });
    let y = 10;
    doc.setFont("courier", "bold"); doc.setFontSize(13);
    doc.text("KiranaNeeds Store", 40, y, { align: "center" }); y += 3;
    doc.setFont("courier", "normal"); doc.setFontSize(8);
    doc.text("Har Ghar Ka Bharosa", 40, y, { align: "center" }); y += 5;
    doc.text("Prithviganj Bazaar, Patti Pratapgarh", 40, y, { align: "center" }); y += 5;
    doc.text("Call/WhatsApp: 8601096821", 40, y, { align: "center" }); y += 6;
    doc.setFontSize(9);
    doc.text(`Bill No: INV-${Date.now().toString().slice(-6)}`, 5, y); y += 4;
    doc.text(`Date: ${new Date().toLocaleString()}`, 5, y); y += 5;
    if (customerName) { doc.text(`Customer: ${customerName}`, 5, y); y += 5; }
    doc.text("------------------------------------------", 0, y); y += 5;
    doc.setFont("courier", "bold");
    doc.text("Item            Qty   Rate   Total", 2, y); y += 4;
    doc.setFont("courier", "normal");
    doc.text("------------------------------------------", 0, y); y += 5;
    cart.forEach((item) => {
      const name = item.name.length > 12 ? item.name.slice(0, 12) : item.name;
      doc.text(`${name.padEnd(14)}${item.qty.toString().padStart(6, " ")}${Number(item.price).toFixed(2).padStart(9, " ")}${Number(item.total).toFixed(2).padStart(7, " ")}`, 2, y);
      y += 5;
    });
    doc.text("------------------------------------------", 0, y); y += 5;
    doc.setFont("courier", "bold");
    doc.text(`Grand Total : ${getTotal()}`, 2, y); y += 5;
    doc.setFont("courier", "normal");
    doc.text(`Payment Mode : ${paymentMode.toUpperCase()}`, 2, y); y += 5;
    doc.text(`Paid Amount  : ${paidAmount || 0}`, 2, y); y += 5;
    doc.text(`Change       : ${changeAmount || 0}`, 2, y); y += 5;
    doc.text(`Udhar        : ${udharAmount || 0}`, 2, y); y += 6;
    doc.text("------------------------------------------", 0, y); y += 6;
    doc.text("Thank you for shopping!", 40, y, { align: "center" }); y += 5;
    doc.text("Visit Again !", 40, y, { align: "center" });
    doc.save("KiranaNeeds_Bill.pdf");
  };

  const completePayment = useCallback(async () => {
    if (cart.length === 0) { toast.error("Cart is empty!"); return; }
    const total = getTotal();
    if (paymentMode === "udhar") setUdharAmount(total);
    if ((paymentMode === "cash" || paymentMode === "upi") && (paidAmount === "" || paidAmount < total)) {
      toast.error("Customer has not paid full amount!"); return;
    }
    if (paymentMode === "split" && (paidAmount === "" || paidAmount <= 0)) {
      toast.warning("Enter paid amount for split payment"); return;
    }
    saveBill({ id: Date.now(), date: new Date().toISOString(), customerName: customerName || "Walk-in", paymentMode, items: cart, total, paidAmount: paymentMode === "udhar" ? 0 : paidAmount, changeAmount, udharAmount: paymentMode === "udhar" ? total : udharAmount });
    await generateInvoice();
    setCart([]); localStorage.removeItem("posCart");
    setCustomerName(""); setPaidAmount(""); setChangeAmount(0); setUdharAmount(0); setPaymentMode("cash");
    toast.success("Bill Completed & Downloaded ✅");
  }, [cart, paymentMode, paidAmount, changeAmount, udharAmount, customerName]);


  const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1800, ctx.currentTime); // high beep
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn("Beep failed:", e);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") setHighlightedIndex((prev) => prev < flatSuggestions.length - 1 ? prev + 1 : prev);
    if (e.key === "ArrowUp") setHighlightedIndex((prev) => prev > 0 ? prev - 1 : 0);
    if (e.key === "Enter" && flatSuggestions.length > 0) {
      const { p, variant } = flatSuggestions[highlightedIndex] || flatSuggestions[0];
      const price = Number(variant.price || 0);
      setCart((prev) => [...prev, { ...p, selectedVariant: variant.label, price, qty: 1, total: price }]);
      setSearch(""); setHighlightedIndex(0);
    }
  };

  useEffect(() => {
    const handleShortcut = (e) => {
      const isTyping = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (e.key === "F2") { e.preventDefault(); setShowQuickItemModal(true); }
      if (e.key === "F3") { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "F4") { e.preventDefault(); setShowScanner(true); }
      if (e.key === "F5") { e.preventDefault(); setShowCustomersModal(true); }
      if (e.key === "F6") { e.preventDefault(); customerInputRef.current?.focus(); }
      if (e.key === "F7") { e.preventDefault(); paidAmountInputRef.current?.focus(); }
      if (e.key === "F8") { e.preventDefault(); completePayment(); }
      if (e.key === "Delete" && !isTyping) { setCart([]); localStorage.removeItem("posCart"); toast.info("Bill cleared"); }
      if (e.key === "s" && !isTyping) completePayment();
      if (e.key === "Escape") { setShowQuickItemModal(false); setShowScanner(false); setShowAddCustomerModal(false); setShowCustomersModal(false); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [completePayment]);

  // ─── SHARED SECTIONS ────────────────────────────────────

  const SearchSection = (
    <div className="relative mb-3">
      <div className="relative w-full text-gray-200">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search item... (F3)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
          onKeyDown={handleKeyDown}
          className="border p-2 pr-24 rounded w-full text-gray-200"
        />
        <button type="button" onClick={() => setShowScanner(true)}
          className="absolute flex items-center gap-1 right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 text-xs">
          F4 <CiBarcode size={18} />
        </button>
      </div>
      {search && flatSuggestions.length > 0 && (
        <ul className="absolute z-10 bg-gray-700 border rounded w-full mt-1 max-h-48 overflow-y-auto shadow">
          {flatSuggestions.map(({ p, variant }, i) => (
            <li key={i}
              onClick={() => { const price = Number(variant.price || 0); setCart((prev) => [...prev, { ...p, selectedVariant: variant.label, price, qty: 1, total: price }]); setSearch(""); setHighlightedIndex(0); }}
              className={`px-3 py-2 cursor-pointer flex justify-between items-center ${highlightedIndex === i ? "bg-cyan-600" : "hover:bg-gray-800"}`}>
              <div className="flex flex-col">
                <span className="text-sm text-white">{p.name}</span>
                <span className="text-xs text-gray-300">{variant.label}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-white">₹{variant.price}</span>
                {variant.mrp && variant.mrp !== variant.price && <span className="text-xs text-gray-300 line-through">₹{variant.mrp}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const CartSection = (
    <div className="relative flex-1 overflow-y-auto bg-gray-800 text-gray-100 rounded">
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-cyan-800 sticky top-0 bg-gray-800">
          <tr>
            <th className="p-2">Item</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Price</th>
            <th className="p-2">Total</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {[...cart].map((item, originalIndex) => ({ item, originalIndex })).reverse().map(({ item, originalIndex }) => (
            <tr key={originalIndex} className="border-b border-gray-600 hover:bg-gray-700">
              <td className="p-2">
                <div className="truncate max-w-[120px]">{item.name}</div>
                {item.selectedVariant && <div className="text-xs text-gray-400">({item.selectedVariant})</div>}
              </td>
              <td className="p-2">
                <input type="number" min="1" value={item.qty}
                  onChange={(e) => updateQty(originalIndex, Number(e.target.value))}
                  className="w-14 p-1 rounded bg-gray-700 text-white text-sm" />
              </td>
              <td className="p-2">₹{item.price}</td>
              <td className="p-2">₹{item.total}</td>
              <td className="p-2">
                <button onClick={() => removeFromCart(originalIndex)} className="text-red-400 text-xs">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setShowQuickItemModal(true)} title="Quick Add (F2)"
        className="absolute right-3 bottom-3 h-14 w-14 flex flex-col items-center justify-center rounded-full bg-blue-700 hover:bg-blue-600 text-white">
        <MdElectricBolt size={20} />
        <span className="text-[9px]">F2</span>
      </button>
    </div>
  );

  const PaymentSection = (
    <div className="flex flex-col gap-3">
      {/* Customer */}
      <div className="relative">
        <input type="text" ref={customerInputRef} value={customerName}
          onChange={(e) => { setCustomerName(e.target.value); setShowCustomerList(true); setHighlightedCustomerIndex(0); }}
          onFocus={() => setShowCustomerList(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setHighlightedCustomerIndex((prev) => prev < filteredCustomers.length - 1 ? prev + 1 : prev);
            if (e.key === "ArrowUp") setHighlightedCustomerIndex((prev) => prev > 0 ? prev - 1 : 0);
            if (e.key === "Enter") {
              if (filteredCustomers.length > 0) {
                const c = filteredCustomers[highlightedCustomerIndex] || filteredCustomers[0];
                setCustomerName(c.name); setCustomerMobile(c.mobile); setShowCustomerList(false); setHighlightedCustomerIndex(0);
              } else if (customerName.trim()) { setShowAddCustomerModal(true); setShowCustomerList(false); }
            }
            if (e.key === "Escape") setShowCustomerList(false);
          }}
          placeholder="Customer name (F6)"
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 w-full text-sm" />
        {showCustomerList && customerName && (
          <ul className="absolute z-50 bg-gray-700 border w-full mt-1 max-h-36 overflow-y-auto rounded shadow-lg">
            {filteredCustomers.map((c, i) => (
              <li key={i} onClick={() => { setCustomerName(c.name); setCustomerMobile(c.mobile); setShowCustomerList(false); setHighlightedCustomerIndex(0); }}
                className={`px-3 py-2 cursor-pointer flex justify-between text-sm ${highlightedCustomerIndex === i ? "bg-cyan-600" : "hover:bg-gray-600"}`}>
                <span>{c.name}</span>
                <span className="text-gray-300 text-xs">{c.mobile}</span>
              </li>
            ))}
            {filteredCustomers.length === 0 && (
              <li onClick={() => setShowAddCustomerModal(true)} className="px-3 py-2 cursor-pointer text-yellow-400 hover:bg-gray-600 text-sm">
                ➕ Add "{customerName}" as new customer
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Total */}
      <div className="text-right text-xl font-bold text-green-400">Total: ₹{getTotal()}.00</div>

      {/* Payment mode */}
      <div className="flex gap-2 flex-wrap">
        {["cash", "upi", "udhar", "split"].map((mode) => (
          <button key={mode} onClick={() => { setPaymentMode(mode); setPaidAmount(""); setChangeAmount(0); setUdharAmount(0); }}
            className={`px-3 py-1 rounded capitalize border text-sm flex-1 ${paymentMode === mode ? "bg-yellow-500 text-black" : "bg-gray-700 text-white border-gray-600"}`}>
            {mode}
          </button>
        ))}
      </div>

      {paymentMode !== "udhar" && (
        <input ref={paidAmountInputRef} type="number" value={paidAmount || ""}
          onChange={(e) => handlePaymentCalculation(e.target.value)}
          placeholder="Paid Amount (F7)"
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 w-full text-sm" />
      )}

      {paymentMode === "udhar" && <div className="text-orange-400 text-sm text-right">Full Udhar: ₹{getTotal()}</div>}
      {changeAmount > 0 && <div className="text-green-400 text-sm text-right">Change: ₹{changeAmount}</div>}
      {udharAmount > 0 && paymentMode !== "udhar" && <div className="text-red-400 text-sm text-right">Udhar: ₹{udharAmount}</div>}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button onClick={() => { setCart([]); localStorage.removeItem("posCart"); toast.info("Bill cleared"); }}
          className="bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold text-sm">
          🗑 Clear (DEL)
        </button>
        <button onClick={completePayment}
          className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold text-sm">
          ✅ Complete (F8)
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="font-semibold text-sm">KiranaNeeds POS</span>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <span className="bg-cyan-600 text-white text-xs px-2 py-0.5 rounded-full">
              {cart.length} items · ₹{getTotal()}
            </span>
          )}
          <button onClick={() => window.open("https://www.kirananeeds.com/admin/products", "_blank")}
            className="text-xs bg-blue-600 px-2 py-1 rounded">+ Item</button>
          <button onClick={() => setShowCustomersModal(true)}
            className="text-xs bg-blue-600 px-2 py-1 rounded">+ Customer (F5)</button>
        </div>
      </div>

      {/* ─── DESKTOP: two-panel ─── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left */}
        <div className="flex-1 flex flex-col p-4 border-r border-gray-700 overflow-hidden">
          {SearchSection}
          {CartSection}
          <div className="flex justify-end mt-2">
            <span className="text-lg font-semibold">Total: ₹{getTotal()}.00</span>
          </div>
        </div>
        {/* Right */}
        <div className="w-96 flex flex-col p-4 bg-gray-800 overflow-y-auto">
          <h2 className="text-yellow-400 font-semibold mb-3">🧾 Customer & Payment</h2>
          {PaymentSection}
        </div>
      </div>

      {/* ─── MOBILE: tab layout ─── */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gray-700">
          <button onClick={() => setActiveTab("cart")}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "cart" ? "border-b-2 border-cyan-400 text-cyan-400" : "text-gray-400"}`}>
            🛒 Cart {cart.length > 0 && <span className="ml-1 bg-cyan-600 text-white text-xs px-1.5 rounded-full">{cart.length}</span>}
          </button>
          <button onClick={() => setActiveTab("payment")}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "payment" ? "border-b-2 border-cyan-400 text-cyan-400" : "text-gray-400"}`}>
            💳 Payment
          </button>
        </div>

        {/* Cart tab */}
        {activeTab === "cart" && (
          <div className="flex flex-col flex-1 p-3 overflow-hidden">
            {SearchSection}
            {CartSection}
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-semibold">Total: ₹{getTotal()}.00</span>
              <button onClick={() => setActiveTab("payment")}
                className="bg-blue-600 text-sm px-4 py-1.5 rounded-lg">
                Pay →
              </button>
            </div>
          </div>
        )}

        {/* Payment tab */}
        {activeTab === "payment" && (
          <div className="flex-1 overflow-y-auto p-3">
            {PaymentSection}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-xl w-[350px]">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="border p-2 rounded w-full mb-3" />
            <input placeholder="Mobile Number" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} className="border p-2 rounded w-full mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddCustomerModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={saveNewCustomer} className="bg-blue-600 text-white px-4 py-2 rounded">Save Customer</button>
            </div>
          </div>
        </div>
      )}

      <Customers isOpen={showCustomersModal} onClose={() => setShowCustomersModal(false)} />

      {showQuickItemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-xl w-[350px] shadow-xl">
            <h2 className="text-xl font-bold mb-4">⚡ Quick Add <span className="text-xs text-gray-400">(F2)</span></h2>
            <input ref={quickItemRef} placeholder="Item Name" value={quickItem.name} onChange={(e) => setQuickItem({ ...quickItem, name: e.target.value })} className="border p-2 rounded w-full mb-3" />
            <input type="number" placeholder="Price" value={quickItem.price} onChange={(e) => setQuickItem({ ...quickItem, price: e.target.value })} className="border p-2 rounded w-full mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowQuickItemModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={addQuickItemToCart} className="bg-blue-600 text-white px-4 py-2 rounded">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-4 w-[340px] relative">
            <button onClick={() => setShowScanner(false)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><MdClose size={22} /></button>
            <h2 className="text-white text-lg font-semibold mb-3 text-center">📷 Scan Barcode</h2>
            <video ref={videoRef} className="w-full rounded-lg border border-gray-600" style={{ height: "240px", objectFit: "cover" }} />
            <p className="text-xs text-gray-400 text-center mt-2">Point camera at barcode</p>
            <button onClick={() => setShowScanner(false)} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}