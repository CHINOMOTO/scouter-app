import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "MIERIS（ミエリス）- 採る前に、事実を知る 就業情報共有システム",
  description: "雑工・荷揚げ・警備・運送 就業情報共有システム。就業実績を本人同意のもとで利用企業間に共有する仕組みです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenance) {
    return (
      <html lang="ja">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-sans antialiased bg-[#f8fafc] text-slate-900 overflow-hidden min-h-screen flex items-center justify-center">
          <div className="relative z-10 text-center px-4 max-w-xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
                <AlertTriangle className="w-12 h-12" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
              システムメンテナンス中
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              ただいま定期メンテナンスおよびシステムの機能更新を行っております。<br />
              終了まで今しばらくお待ちくださいますようお願い申し上げます。
            </p>
            <div className="inline-block px-4 py-2 border border-slate-300 bg-white rounded-lg text-xs text-slate-500 font-mono shadow-sm">
              MIERIS SYSTEM MAINTENANCE
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-[#f8fafc] text-slate-900 overflow-x-hidden min-h-screen selection:bg-white selection:text-white flex flex-col">
        <Navigation />
        <main className="relative z-10 flex-grow">{children}</main>
        <footer className="relative z-10 py-10 text-center text-slate-500 text-xs border-t border-slate-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="font-bold text-slate-700">MIERIS - 雑工・荷揚げ・警備・運送 就業情報共有システム</p>
            <p className="text-slate-500">運営: 株式会社ミヤエモン / 開発: 株式会社宇井建設</p>
            <p className="text-slate-600 font-mono text-[11px]">&copy; 2026 MIERIS. ALL RIGHTS RESERVED.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
