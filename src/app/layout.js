import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SyncProvider from "./utils/SyncProvider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "POS Billing",
  description: "Fast billing, inventory, and customer management for retail stores.",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <SyncProvider>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
         <ToastContainer
          position="top-right"
          autoClose={2000}
          theme="dark"
        />
      </body>
      </SyncProvider>
    </html>
  );
}
