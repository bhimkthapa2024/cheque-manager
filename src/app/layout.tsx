import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppContent } from "@/components/AppContent";
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
  title: "ChequePro",
  description: "A centralized system for cheque lifecycle tracking and vendor management.",
  manifest: "/manifest.json",
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
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <CompanyProvider>
                <AppContent>
                  {children}
                </AppContent>
              </CompanyProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
