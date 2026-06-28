import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { TopHeader } from "@/components/TopHeader";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Multi-Company Cheque Manager",
  description: "A centralized system for cheque lifecycle tracking and vendor management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-[#F1F5F9] text-slate-900">
        <CompanyProvider>
          <ConfirmProvider>
            <ToastProvider>
              <Sidebar />
              <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader />
                <main className="flex-1 overflow-y-auto p-12 scroll-smooth">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </ConfirmProvider>
        </CompanyProvider>
      </body>
    </html>
  );
}
