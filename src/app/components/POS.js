"use client";
import { useState, useEffect, useRef } from "react";
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

  const inputRef = useRef(null);
  const quickItemRef = useRef(null);
  const router = useRouter();

  // ─── Quick Item shortcut ───
useEffect(() => {
  const handleShortcut = (e) => {
  if (e.key === "F2") { e.preventDefault(); setShowQuickItemModal(true); }
  if (e.key === "F3") { e.preventDefault(); inputRef.current?.focus(); } // ✅ focus search
  if (e.key === "F3") { e.preventDefault(); inputRef.current?.focus(); } // ✅ focus search
  if (e.key === "F4") { e.preventDefault(); setShowScanner(true); }       // barcode scanner
  if (e.key === "Escape") {                                                 // close any modal
    setShowQuickItemModal(false);
    setShowScanner(false);
    setShowAddCustomerModal(false);
  }
};
  window.addEventListener("keydown", handleShortcut);
  return () => window.removeEventListener("keydown", handleShortcut);
}, []);

  // ─── add these states at the top of POS ───
const [showScanner, setShowScanner] = useState(false);
const videoRef = useRef(null);
const controlsRef = useRef(null); // ✅ store controls, not the reader


useEffect(() => {
  if (!showScanner) return;

  const codeReader = new BrowserMultiFormatReader();

  const startScanner = async () => {
    try {
      controlsRef.current = await codeReader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err) => {
          if (result) {
            const scannedCode = result.getText();

            const matched = products.find(
              (p) => p.barcode === scannedCode || p.slug === scannedCode
            );

            if (matched) {
              const defaultVariant = matched.variants?.[0];
              const price = Number(defaultVariant?.price || 0);
              const label = defaultVariant?.label || "Default";
              setCart((prev) => [
                ...prev,
                { ...matched, selectedVariant: label, price, qty: 1, total: price },
              ]);
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

  return () => {
    controlsRef.current?.stop(); // ✅ stop() on controls, not reset() on reader
    controlsRef.current = null;
  };
}, [showScanner, products]);


  // ─── FILTERED ───────────────────────────────────────────
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerName.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── EFFECTS ────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (showQuickItemModal) {
      setTimeout(() => quickItemRef.current?.focus(), 100);
    }
  }, [showQuickItemModal]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    const loadCustomers = async () => {
      const data = await getCustomers();
      setCustomers(data || []);
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts();
      setProducts(data || []);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("posCart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem("posCart", JSON.stringify(cart));
  }, [cart]);

  // ─── CART ───────────────────────────────────────────────
  const addToCart = (product) => {
    const defaultVariant = product.variants?.[0];
    const price = Number(defaultVariant?.price || 0);
    const label = defaultVariant?.label || "Default";
    setCart((prev) => [
      ...prev,
      { ...product, selectedVariant: label, price, qty: 1, total: price },
    ]);
  };

  const updateQty = (index, qty) => {
    const updatedCart = [...cart];
    const price = Number(updatedCart[index].price);
    updatedCart[index].qty = qty;
    updatedCart[index].total = qty * price;
    setCart(updatedCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getTotal = () => cart.reduce((sum, i) => sum + i.total, 0);

  // ─── QUICK ITEM ─────────────────────────────────────────
  const addQuickItemToCart = () => {
  if (!quickItem.name.trim() || !quickItem.price) {
    toast.error("Enter item name & price");
    return;
  }
  const price = Number(quickItem.price);
  const newItem = {
    name: quickItem.name,
    price,
    selectedVariant: "Custom",
    qty: 1,
    total: price,
    id: "quick_" + Date.now(),
  };
  setCart((prev) => [...prev, newItem]);
  setQuickItem({ name: "", price: "" });
  setShowQuickItemModal(false);
  toast.success("Item added ✅");
  setTimeout(() => inputRef.current?.focus(), 100); // ✅ refocus search
};

  // ─── CUSTOMER ───────────────────────────────────────────
  const saveNewCustomer = async () => {
    if (!customerName.trim()) {
      toast.error("Enter customer name");
      return;
    }
    await addCustomer({
      name: customerName.trim(),
      mobile: customerMobile ? customerMobile.trim() : "",
    });
    const updated = await getCustomers();
    setCustomers(updated || []);
    setCustomerName("");
    setCustomerMobile("");
    setShowAddCustomerModal(false);
    toast.success("Customer added ✅");
  };

  // ─── PAYMENT ────────────────────────────────────────────
  const handlePaymentCalculation = (value) => {
    const total = getTotal();
    if (value === "") {
      setPaidAmount("");
      setChangeAmount(0);
      setUdharAmount(0);
      return;
    }
    const paid = Number(value);
    setPaidAmount(paid);
    if (paid >= total) {
      setChangeAmount(paid - total);
      setUdharAmount(0);
    } else {
      setChangeAmount(0);
      setUdharAmount(total - paid);
    }
  };

  const completePayment = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }
    const total = getTotal();
    if (paymentMode === "udhar") setUdharAmount(total);
    if (paymentMode === "cash" || paymentMode === "upi") {
      if (paidAmount === "" || paidAmount < total) {
        toast.error("Customer has not paid full amount!");
        return;
      }
    }
    if (paymentMode === "split") {
      if (paidAmount === "" || paidAmount <= 0) {
        toast.warning("Enter paid amount for split payment");
        return;
      }
    }
    const bill = {
      id: Date.now(),
      date: new Date().toISOString(),
      customerName: customerName || "Walk-in",
      paymentMode,
      items: cart,
      total,
      paidAmount: paymentMode === "udhar" ? 0 : paidAmount,
      changeAmount,
      udharAmount: paymentMode === "udhar" ? total : udharAmount,
    };
    saveBill(bill);
    await generateInvoice();
    setCart([]);
    localStorage.removeItem("posCart");
    setCustomerName("");
    setPaidAmount("");
    setChangeAmount(0);
    setUdharAmount(0);
    setPaymentMode("cash");
    toast.success("Bill Completed & Downloaded ✅");
  };

  // ─── KEYBOARD ───────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      const product = filteredProducts[highlightedIndex] || filteredProducts[0];
      addToCart(product);
      setSearch("");
    }
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    }
    if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
  };

  // ─── INVOICE ────────────────────────────────────────────
  const generateInvoice = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 200] });
    let y = 10;

    doc.setFont("courier", "bold");
    doc.setFontSize(13);
    doc.text("KiranaNeeds Store", 40, y, { align: "center" });
    y += 3;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("Har Ghar Ka Bharosa", 40, y, { align: "center" });
    y += 5;
    doc.text("Prithviganj Bazaar, Patti Pratapgarh", 40, y, { align: "center" });
    y += 5;
    doc.text("Call/WhatsApp: 8601096821", 40, y, { align: "center" });
    y += 6;

    doc.setFontSize(9);
    const invoiceNo = "INV-" + Date.now().toString().slice(-6);
    const date = new Date().toLocaleString();
    doc.text(`Bill No: ${invoiceNo}`, 5, y); y += 4;
    doc.text(`Date: ${date}`, 5, y); y += 5;
    if (customerName) { doc.text(`Customer: ${customerName}`, 5, y); y += 5; }

    doc.text("------------------------------------------", 0, y); y += 5;
    doc.setFont("courier", "bold");
    doc.text("Item            Qty   Rate   Total", 2, y); y += 4;
    doc.setFont("courier", "normal");
    doc.text("------------------------------------------", 0, y); y += 5;

    cart.forEach((item) => {
      const name = item.name.length > 12 ? item.name.slice(0, 12) : item.name;
      const qty = item.qty.toString().padStart(6, " ");
      const price = Number(item.price).toFixed(2).toString().padStart(9, " ");
      const total = Number(item.total).toFixed(2).toString().padStart(7, " ");
      doc.text(`${name.padEnd(14)}${qty}${price}${total}`, 2, y);
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

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="h-screen flex bg-gray-900 text-white">

      {/* Left Panel */}
      <div className="flex-1 flex p-4 flex-col border-r border-gray-700">
        <div className="flex justify-between gap-2 mb-1">
          <h2 className="text-lg mb-3">KiranaNeeds Point of Sale (POS)</h2>
          <div>
          <button
            className="rounded px-2 text-sm py-1 bg-blue-600"
            onClick={() => window.open("https://www.kirananeeds.com/admin/products", "_blank")}
          >
            + New Item
          </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              placeholder="Press 'f3' to add new item"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border p-2 pr-10 rounded w-full"
            />
            <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="absolute flex gap-2 right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <span className="text-sm text-gray-100"></span>Press 'f4'
            <CiBarcode size={20} />
          </button>
          </div>

          {/* Suggestions Dropdown */}
          {search && filteredProducts.length > 0 && (
            <ul className="absolute z-10 bg-gray-700 border rounded w-full mt-1 max-h-48 overflow-y-auto shadow">
              {filteredProducts.flatMap((p, i) =>
                (p.variants || []).map((variant, vi) => (
                  <li
                    key={`${i}-${vi}`}
                    onClick={() => {
                      const price = Number(variant.price || 0);
                      setCart((prev) => [
                        ...prev,
                        { ...p, selectedVariant: variant.label, price, qty: 1, total: price },
                      ]);
                      setSearch("");
                    }}
                    className={`px-3 py-2 cursor-pointer flex justify-between items-center ${
                      highlightedIndex === i && vi === 0 ? "bg-cyan-600" : "hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{p.name}</span>
                      <span className="text-xs text-gray-400">{variant.label}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-white">₹{variant.price}</span>
                      {variant.mrp && variant.mrp !== variant.price && (
                        <span className="text-xs text-gray-400 line-through">₹{variant.mrp}</span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Cart Table */}
        <div className="relative min-h-[75vh] max-h-[75vh] overflow-y-auto bg-gray-800 text-gray-100 mb-4">
          <table className="w-full text-left">
            <thead className="border-b-2 border-cyan-800">
              <tr>
                <th className="p-2">Product Name</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Price</th>
                <th className="p-2">Total</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...cart]
                .map((item, originalIndex) => ({ item, originalIndex }))
                .reverse()
                .map(({ item, originalIndex }) => (
                  <tr
                    key={originalIndex}
                    className="border-b-2 border-gray-600 border-dashed hover:bg-gray-700"
                  >
                    <td className="p-2">
                      {item.name}
                      {item.selectedVariant && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({item.selectedVariant})
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateQty(originalIndex, Number(e.target.value))}
                        className="w-16 p-1 rounded bg-gray-700 text-white"
                      />
                    </td>
                    <td className="p-2">₹{item.price}</td>
                    <td className="p-2">₹{item.total}</td>
                    <td className="p-2">
                      <button
                        onClick={() => removeFromCart(originalIndex)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <button
            onClick={() => setShowQuickItemModal(true)}
            title="Quick Add Item (F2)"  // ✅ hover tooltip
            className="absolute right-6 bottom-6"
          >
          <div className="h-20 w-20 text-center flex flex-col items-center justify-center rounded-full bg-blue-700 p-2 text-2xl hover:bg-blue-600">
            <MdElectricBolt />
            <span className="text-sm text-gray-100">Press 'F2'</span>
          </div>
          </button>
        </div>

        <div className="flex justify-end">
          <h2 className="text-xl font-semibold">Total: ₹{getTotal()}.00</h2>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-120 relative grid grid-cols-2 gap-3 p-4 bg-gray-800 text-white border-l border-gray-700">
        <div className="w-110 text-white">
          <div className="flex justify-between gap-2">
            <h2 className="text-lg font-semibold text-yellow-400 mb-4">🧾 Customer Details</h2>
            <div>
            <button
              className="rounded px-2 py-1 text-sm bg-blue-600"
              onClick={() => setShowCustomersModal(true)}
            >
              + New Customer
            </button>
            </div>
          </div>

          <div className="gap-4 h-[48vh] relative">
            <div className="flex flex-col">
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                  placeholder="Enter customer name (Press 'F5')"
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full"
                />
                {showCustomerList && customerName && (
                  <ul className="absolute z-50 bg-gray-700 border w-full mt-1 max-h-40 overflow-y-auto rounded shadow-lg">
                    {filteredCustomers.map((c, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          setCustomerName(c.name);
                          setCustomerMobile(c.mobile);
                          setShowCustomerList(false);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-600 flex justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-sm text-gray-300">{c.mobile}</span>
                      </li>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <li
                        onClick={() => setShowAddCustomerModal(true)}
                        className="px-3 py-2 cursor-pointer text-yellow-400 hover:bg-gray-600"
                      >
                        ➕ Add "{customerName}" as new customer
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 right-0">
              <h2 className="text-2xl text-end text-green-500 mt-5 font-semibold">
                Total Bill: ₹{getTotal()}.00
              </h2>

              <div className="flex gap-2 justify-end mt-3">
                {["cash", "upi", "udhar", "split"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setPaymentMode(mode);
                      setPaidAmount("");
                      setChangeAmount(0);
                      setUdharAmount(0);
                    }}
                    className={`px-3 py-1 rounded capitalize border ${
                      paymentMode === mode
                        ? "bg-yellow-500 text-black"
                        : "bg-gray-800 text-white border-gray-700"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {paymentMode !== "udhar" && (
                <div className="flex mt-2 justify-end">
                  <input
                    type="number"
                    value={paidAmount || ""}
                    onChange={(e) => handlePaymentCalculation(e.target.value)}
                    placeholder="Enter Paid Amount (Press F6)"
                    className="bg-gray-800 w-65 border border-gray-700 text-white rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {paymentMode === "udhar" && (
                <h2 className="text-end text-orange-400 mt-2">
                  Full Amount Udhar : ₹{getTotal()}
                </h2>
              )}

              {changeAmount > 0 && (
                <h2 className="text-end text-green-400 mt-2">
                  Change Return : ₹{changeAmount}
                </h2>
              )}

              {udharAmount > 0 && paymentMode !== "udhar" && (
                <h2 className="text-end text-red-400 mt-2">
                  Remaining Udhar : ₹{udharAmount}
                </h2>
              )}
            </div>
          </div>
        </div>

        <div className="h-[20vh] w-full text-2xl grid grid-cols-2 gap-3 md:p-6 bg-gray-700 absolute bottom-0">
          {/* <button
            disabled
            className="bg-yellow-500 hover:bg-yellow-600 p-3 rounded-lg font-semibold shadow"
          >
            Hold Bill
          </button>
          <button
            disabled
            className="bg-green-500 hover:bg-yellow-600 p-3 rounded-lg font-semibold shadow"
          >
            Save for Later
          </button> */}
          <button
            onClick={() => { setCart([]); localStorage.removeItem("posCart"); }}
            className="flex flex-col  bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold shadow"
          >
            Clear Bill
            <span className="text-sm text-gray-100">(Press 'DEL')</span>
          </button>
          <button
            type="button"
            onClick={completePayment}
            className="flex flex-col bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold shadow"
          >
            Complete Bill
            <span className="text-sm text-gray-100">(Press 'S')</span>

          </button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-xl w-[350px]">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <input
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="border p-2 rounded uppercase w-full mb-3"
            />
            <input
              placeholder="Mobile Number"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveNewCustomer}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      <Customers isOpen={showCustomersModal} onClose={() => setShowCustomersModal(false)} />

      {/* Quick Item Modal */}
      {showQuickItemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-xl w-[350px] shadow-xl">
            <h2 className="text-xl font-bold mb-4">
  ⚡ Quick Add Item
  <span className="text-xs font-normal text-gray-400 ml-2">(F2)</span>
</h2>
            <input
              ref={quickItemRef}
              placeholder="Item Name (eg: Carry Bag)"
              value={quickItem.name}
              onChange={(e) => setQuickItem({ ...quickItem, name: e.target.value })}
              className="border p-2 rounded w-full mb-3"
            />
            <input
              type="number"
              placeholder="Price"
              value={quickItem.price}
              onChange={(e) => setQuickItem({ ...quickItem, price: e.target.value })}
              className="border p-2 rounded w-full mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={addQuickItemToCart}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add to Cart
              </button>
              <button
                onClick={() => setShowQuickItemModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

{/* Barcode Scanner Modal */}
{showScanner && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="bg-gray-900 rounded-xl p-4 w-[360px] relative">

      <button
        onClick={() => setShowScanner(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
      >
        <MdClose size={22} />
      </button>

      <h2 className="text-white text-lg font-semibold mb-3 text-center">
        📷 Scan Barcode
      </h2>

      <video
        ref={videoRef}
        className="w-full rounded-lg border border-gray-600"
        style={{ height: "260px", objectFit: "cover" }}
      />

      {/* Scanner overlay guide */}
      <div className="relative mt-2 flex justify-center">
        <span className="text-xs text-gray-400">
          Point camera at barcode to scan
        </span>
      </div>

      <button
        onClick={() => setShowScanner(false)}
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
      >
        Cancel
      </button>
    </div>
  </div>
)}
    </div>
  );
}