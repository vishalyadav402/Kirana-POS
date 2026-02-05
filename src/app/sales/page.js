"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { getSales } from "@/app/utils/storage";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
const [previewSale, setPreviewSale] = useState(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setSales(await getSales());
  };

  const viewInvoice = (sale) => {
  const doc = generateInvoiceDoc(sale);
  const pdfUrl = doc.output("bloburl");
  setPreviewSale(pdfUrl);
};


  const printInvoice = (sale) => {
  const doc = generateInvoiceDoc(sale);
  doc.save(`Invoice_${sale.invoiceNo}.pdf`);
};

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧾 Sales History</h1>

      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Invoice</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Customer</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td className="border p-2">{s.invoiceNo}</td>
              <td className="border p-2">{s.date}</td>
              <td className="border p-2">{s.customerName}</td>
              <td className="border p-2">₹{s.total}</td>
              <td className="border p-2 flex gap-2">
                <button
                    onClick={() => viewInvoice(s)}
                    className="bg-gray-600 text-white px-3 py-1 rounded"
                >
                    View
                </button>

                <button
                    onClick={() => printInvoice(s)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                    Print
                </button>
                </td>

            </tr>
          ))}
        </tbody>
      </table>


      {previewSale && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
    <div className="bg-white w-[380px] h-[600px] rounded shadow relative">
      <button
        onClick={() => setPreviewSale(null)}
        className="absolute top-2 right-2 text-red-600 font-bold"
      >
        ✖
      </button>

      <iframe
        src={previewSale}
        className="w-full h-full rounded"
        title="Invoice Preview"
      />
    </div>
  </div>
)}

    </div>
  );
}


const generateInvoiceDoc = (sale) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200],
  });

  let y = 10;

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text("KiranaNeeds Store", 40, y, { align: "center" });
  y += 3;
  doc.setFontSize(8);
  doc.text("Har Ghar Ka Bharosa", 40, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.text(`Bill No: ${sale.invoiceNo}`, 5, y);
  y += 4;
  doc.text(`Date: ${sale.date}`, 5, y);
  y += 5;

  doc.text(
    `Customer: ${sale.customerName} | ${sale.customerMobile || "-"}`,
    5,
    y
  );
  y += 5;

  doc.text("------------------------------------------", 0, y);
  y += 5;

  doc.setFont("courier", "bold");
  doc.text("Item        Qty   Rate   Total", 2, y);
  y += 4;
  doc.setFont("courier", "normal");

  sale.items.forEach((item) => {
    const line = `${item.name.slice(0, 10)}  ${item.qty}  ${item.price}  ${item.total}`;
    doc.text(line, 2, y);
    y += 5;
  });

  doc.text("------------------------------------------", 0, y);
  y += 5;

  doc.setFont("courier", "bold");
  doc.text(`Grand Total: ₹${sale.total}`, 40, y);

  return doc;
};
