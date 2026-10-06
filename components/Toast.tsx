"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastMessage = {
  type: "success" | "error" | "info";
  text: string;
};

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isInfo = toast.type === "info";

  return (
    <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-sm sm:max-w-md w-full px-4 sm:px-0">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all ${
          isSuccess
            ? "bg-white border-emerald-200 text-slate-800 shadow-emerald-500/5"
            : isInfo
            ? "bg-white border-blue-200 text-slate-800 shadow-blue-500/5"
            : "bg-white border-rose-200 text-slate-800 shadow-rose-500/5"
        }`}
      >
        <div
          className={`p-1 rounded-lg shrink-0 ${
            isSuccess 
              ? "bg-emerald-50 text-emerald-600" 
              : isInfo 
              ? "bg-blue-50 text-blue-600" 
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isInfo ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 pt-0.5 min-w-0">
          <p className="text-xs font-bold text-slate-900 mb-0.5">
            {isSuccess ? "成功" : isInfo ? "ご案内" : "エラー"}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed break-words font-medium">
            {toast.text}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
