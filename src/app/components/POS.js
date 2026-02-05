"use client";
import { useState, useEffect, useRef } from "react";
import { getProducts, saveProducts } from "../utils/storage";
import jsPDF from "jspdf";
import { CiBarcode } from "react-icons/ci";
import { useRouter } from "next/navigation";
import { MdElectricBolt } from "react-icons/md";
import { saveBill } from "../utils/billingStorage";
import {
  getCustomers,
  addCustomer
} from "../utils/storage";


export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState("");

const [customers, setCustomers] = useState([]);
const [showCustomerList, setShowCustomerList] = useState(false);
const [showAddCustomerModal, setShowAddCustomerModal] = useState(false); // ⭐ THIS WAS MISSING


const filteredCustomers = customers.filter((c) =>
  c.name.toLowerCase().includes(customerName.toLowerCase())
);

const saveNewCustomer = () => {
  if (!customerName || !customerMobile) {
    alert("Enter name & mobile");
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: customerName,
    mobile: customerMobile
  };

  addCustomer(newCustomer);
  setCustomers(getCustomers());
  setShowAddCustomerModal(false);

  alert("Customer added ✅");
};


  useEffect(() => {
  setCustomers(getCustomers());
}, []);

  useEffect(() => {
  const savedCart = localStorage.getItem("posCart");
  if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

    useEffect(() => {
    localStorage.setItem("posCart", JSON.stringify(cart));
    }, [cart]);

    
    const completePayment = () => {
  if (cart.length === 0) return alert("Cart is empty!");
  if (!paidAmount || paidAmount < getTotal())
    return alert("Enter valid paid amount");

  // 🧾 CREATE BILL OBJECT
  const bill = {
    id: Date.now(),
    date: new Date().toISOString(),
    customerName: customerName || "Walk-in",
    customerMobile,
    paymentMode: "Cash",
    items: cart,
    total: getTotal(),
  };

  // 💾 SAVE BILL → THIS FIXES DASHBOARD
  saveBill(bill);

  // 🖨️ generate invoice
  generateInvoice();

  // 🔄 RESET POS
  setCart([]);
  localStorage.removeItem("posCart");
  setCustomerName("");
  setCustomerMobile("");
  setPaidAmount("");
  setChangeAmount("");

  alert("Bill Saved & Invoice Generated ✅");
};


  // Focus input by default
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Handle Enter key to add first/highlighted item
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      const product = filteredProducts[highlightedIndex] || filteredProducts[0];
      addToCart(product);
      setSearch(""); // clear input after selection
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

  useEffect(() => {
    setProducts(getProducts());
  }, []);

 const addToCart = (product) => {
  if (product.stock <= 0) return alert("Out of stock!");

  const price = Number(product.retail_price);

  const updatedCart = [
    ...cart,
    {
      ...product,
      retail_price: price,   // 🔥 ensure number
      qty: 1,
      total: price
    }
  ];

  setCart(updatedCart);

  // Deduct stock
  const updatedProducts = products.map((p) =>
    p.name === product.name ? { ...p, stock: p.stock - 1 } : p
  );

  setProducts(updatedProducts);
  saveProducts(updatedProducts);
};


  const updateQty = (index, qty) => {
  let updatedCart = [...cart];

  const price = Number(updatedCart[index].retail_price);

  updatedCart[index].qty = qty;
  updatedCart[index].total = qty * price;

  setCart(updatedCart);
};


  const getTotal = () => cart.reduce((sum, i) => sum + i.total, 0);

  const removeFromCart = (index) => {
  setCart(cart.filter((_, i) => i !== index));
};

// 🧾 External function
const calculateChange = (paid, total) => {
  const change = paid - total;
  return change > 0 ? change.toFixed(2) : 0;
};


const generateInvoice = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], // 3-inch printer width (~80mm), height auto-adjust
  });

  let y = 10; // vertical position

  // ---------- Header ----------
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text("KiranaNeeds Store", 40, y, { align: "center" });
  y += 3;
  doc.setFont("courier", "semibold");
  doc.setFontSize(8);
  doc.text("Har Ghar Ka Bharosa", 40, y, { align: "center" });
  y += 5;
  doc.setFont("courier", "normal");
  doc.text("Prithviganj Bazaar, Patti Pratapgarh", 40, y, { align: "center" });
  y += 5;
  doc.setFont("courier", "semibold");
  doc.text("Order on Call / Whatsapp: 8601096821", 40, y, { align: "center" });
  y += 6;

   // ---------- Invoice Info ----------
  doc.setFontSize(9);
  const invoiceNo = "INV-" + Date.now().toString().slice(-6);
  const date = new Date().toLocaleString();
  doc.text(`Bill No: ${invoiceNo}`, 5, y);
  y += 4;
  doc.text(`Date: ${date}`, 5, y);
  y += 5;

  if (customerName || customerMobile) {
    doc.text(
      `Customer: ${customerName || "Walk-in"} | Mob: ${
        customerMobile || "-"
      }`,
      5,
      y
    );
    y += 5;
  }
  
  // ---------- Divider ----------
  doc.setFont("courier", "normal");
  doc.text("------------------------------------------", 0, y);
  y += 5;

    // ---------- Table Header ----------
  doc.setFont("courier", "bold");
  doc.text("Item                Qty   Rate   Total", 2, y);
  y += 4;
  doc.setFont("courier", "normal");
  doc.text("------------------------------------------", 0, y);
  y += 5;

   // ---------- Items ----------
  cart.forEach((item) => {
    let name = item.name.length > 12 ? item.name.slice(0, 12) : item.name;
    const qty = item.qty.toString().padStart(7, " ");
    const price = item.retail_price.toFixed(2).toString().padStart(10, " ");
    const total = item.total.toFixed(2).toString().padStart(7, " ");
    doc.text(
      `${name.padEnd(14, " ")}${qty}${price}${total}`,
      2,
      y
    );
    y += 5;
  });
 
  // Separator
  doc.text("-------------------------------------------", 0, y);
  y += 5;

  // Total
  doc.setFont("courier", "bold");
  doc.text(`Grand Total: ${getTotal()}.00`, 40, y);
  y += 5;
  doc.setFont("courier", "normal");
  doc.text(`Paid: ${paidAmount}`, 58, y);
  y += 5;
  doc.setFont("courier", "normal");
  doc.text(`Change: ${changeAmount}`, 49, y);
  y += 5;



  // const gst = subTotal * 0.05;
  // const discount = discountAmount;
  // const grandTotal = subTotal + gst - discount;
  // const paid = paidAmount;
  // const change = paid - grandTotal;

  // doc.setFont("courier", "bold");
  // doc.text(`Subtotal: ₹${subTotal.toFixed(2)}`, 2, y);
  // y += 5;
  // doc.text(`GST (5%): ₹${gst.toFixed(2)}`, 2, y);
  // y += 5;
  // if (discount > 0) {
  //   doc.text(`Discount: ₹${discount.toFixed(2)}`, 2, y);
  //   y += 5;
  // }
  // doc.text(`Total: ₹${grandTotal.toFixed(2)}`, 2, y);
  // y += 5;
  



  
   // ---------- Footer ----------
  doc.text("------------------------------------------", 0, y);
  y += 6;
  doc.setFont("courier", "normal");
  doc.text("Thank you for shopping with us!", 40, y, { align: "center" });
  y += 5;
  doc.text("Visit Again", 40, y, { align: "center" });

  doc.save("Kirananeeds_bill.pdf");

};

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const router = useRouter();

  return (
    <div className="h-screen flex bg-gray-900 text-white">
        {/* Left Panel */}
      <div className="flex-1 flex p-4 flex-col border-r border-gray-700">
        <div className="flex justify-between gap-2">
        <h2 className="text-xl mb-3">KiranaNeeds Point of Sale (POS)</h2>
        <div>
        <button className="rounded p-2 py-1 bg-blue-400" onClick={()=>router.push("/products")}>+ New Item</button>
        </div>
        </div>
      <div className="relative mb-4">
      {/* Search Input with Barcode */}
<div className="relative w-full">
  <input
    ref={inputRef}
    type="text"
    placeholder="I want to sell.."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onKeyDown={handleKeyDown}
    className="border p-2 pr-10 rounded w-full"
  />

  <button
    type="button"
    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
  >
    <CiBarcode size={20} />
  </button>
</div>


      {/* Suggestions Dropdown */}
      {search && filteredProducts.length > 0 && (
        <ul className="absolute z-10 bg-gray-700 border rounded w-full mt-1 max-h-48 overflow-y-auto shadow">
          {filteredProducts.map((p, i) => (
            <li
              key={i}
              onClick={() => {
                addToCart(p);
                setSearch("");
              }}
              className={`px-3 py-2 cursor-pointer flex justify-between ${
                highlightedIndex === i ? "bg-cyan-600" : "hover:bg-gray-800"
              }`}
            >
              <span>{p.name}</span>
              <span className="text-sm text-gray-100">₹{p.retail_price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  

      {/* Cart */}
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
      {[...cart].reverse().map((item, i) => (
        <tr
          key={i}
          className="border-b-2 border-gray-600 border-dashed hover:bg-gray-700"
        >
          <td className="p-2">{item.name}</td>
          <td className="p-2">
            <input
              type="number"
              min="1"
              value={item.qty}
              onChange={(e) => updateQty(i, Number(e.target.value))}
              className="w-16 p-1 rounded"
            />
          </td>
          <td className="p-2">₹{item.retail_price}</td>
          <td className="p-2">₹{item.total}</td>
          <td className="p-2">
            <button
              onClick={() => removeFromCart(i)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ❌
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>

 <button onClick={()=>("")} className="absolute right-6 bottom-6 rounded-full bg-blue-700 p-2 text-2xl"><MdElectricBolt /></button>
</div>

      {/* Total + Invoice */}
      <div className="flex justify-end">
        <h2 className="text-xl font-semibold">Total: ₹{getTotal()}.00</h2>
      </div>
    </div>


   {/* Right Panel (Buttons) */}
<div className="w-120 relative grid grid-cols-2 gap-3 p-4 bg-gray-800 text-white border-l border-gray-700">
  <div className="w-110 text-white">
  <div className="flex justify-between gap-2">
  <h2 className="text-lg font-semibold text-yellow-400 mb-4">
    🧾 Customer Details
  </h2>
  <div>
  <button className="rounded p-2 py-1 bg-blue-400" onClick={()=>router.push("/customers")}>+ New Customer</button>
  </div>
</div>
  <div className="gap-4 h-[48vh] relative">
    {/* Customer Name */}
    <div className="flex flex-col">
     <div className="relative">
  <input
    type="text"
    value={customerName}
    onChange={(e) => {
      setCustomerName(e.target.value);
      setShowCustomerList(true);
    }}
    onFocus={() => setShowCustomerList(true)}
    placeholder="Enter customer name"
    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full"
  />

  {/* Suggestions */}
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

      {/* ➕ Add new customer option */}
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

    {/* Customer Mobile */}
    <div className="flex flex-col mt-2">
      <input
        id="customerMobile"
        type="tel"
        onChange={(e)=>setCustomerMobile(e.target.value)}
        placeholder="Enter mobile number"
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
      />
    </div>

    <div className="absolute bottom-0 right-0">
        {/* Total Amount */}
        <h2 className="text-2xl text-end text-green-500 mt-5 font-semibold">Total Bill: ₹{getTotal()}.00</h2>
        {/* amount Paid */}
        <div className="flex mt-2 justify-end">
            <input
              type="number"
              required
              value={paidAmount || ""}   // 👈 important change
              onChange={(e) => {
                const value = e.target.value === "" ? "" : Number(e.target.value);
                setPaidAmount(value);
                if (value === "") {
                  setChangeAmount(0);
                } else {
                  setChangeAmount(calculateChange(value, getTotal()));
                }
              }}
              placeholder="Enter Paid Amount"
              className="bg-gray-800 w-50 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
            />
        </div>

        {/* Return change */}
       {changeAmount >0 &&
        <>
        <h2 className="text-end text-xl mt-2 text-gray-400">
        Change Return : <span className="text-green-400">₹{changeAmount}</span>
        </h2>
        </>
        }
    </div>

  </div>
</div>

  <div className="h-[40vh] w-full text-2xl grid grid-cols-2 gap-3 md:p-6 bg-gray-700 absolute bottom-0">
  {/* Save Draft */}
  <button
  disabled
    onClick={() => alert("Draft saved (demo)")}
    className="bg-yellow-500 hover:bg-yellow-600 p-3 rounded-lg font-semibold shadow"
  >
    Hold Bill
  </button>

   <button
   disabled
    onClick={() => alert("Draft saved (demo)")}
    className="bg-green-500 hover:bg-yellow-600 p-3 rounded-lg font-semibold shadow"
  >
    Save for Later
  </button>
  {/* Clear Order */}
  <button
  onClick={() => {
    setCart([]);
    localStorage.removeItem("posCart");
  }}
  className="bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold shadow"
>
  Clear Bill
</button>

  {/* Generate Invoice */}
  <button
    type="submit"
    onClick={()=>paidAmount>0 ? completePayment():alert("Enter Amount")}
    className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold shadow"
  >
    Complete Bill
  </button>

  </div>
</div>

    
 



{showAddCustomerModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-white text-black p-6 rounded-xl w-[350px]">
      <h2 className="text-xl font-bold mb-4">Add New Customer</h2>

      <input
        placeholder="Customer Name"
        value={customerName}
        onChange={(e)=>setCustomerName(e.target.value)}
        className="border p-2 rounded w-full mb-3"
      />

      <input
        placeholder="Mobile Number"
        value={customerMobile}
        onChange={(e)=>setCustomerMobile(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={()=>setShowAddCustomerModal(false)}
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

</div>
 );
}