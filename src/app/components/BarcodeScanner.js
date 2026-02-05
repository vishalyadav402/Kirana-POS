"use client";
import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function BarcodeScanner() {
  const [result, setResult] = useState("");

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">📷 Barcode Scanner</h2>
      <Scanner
        onScan={(detectedCodes) => {
          if (detectedCodes.length > 0) {
            setResult(detectedCodes[0].rawValue);
          }
        }}
        onError={(err) => console.error(err)}
        constraints={{ facingMode: "environment" }}
        formats={[
          "code_128",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_39",
          "code_93",
          "codabar",
          "itf"
        ]}
        style={{ width: "80%" }}
      />
      <p className="mt-4 font-medium">
        Scanned Code: <span className="text-blue-600">{result || "–"}</span>
      </p>
    </div>
  );
}
