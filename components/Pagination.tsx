"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    className = ""
}: PaginationProps) {
    if (totalItems === 0 || totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // ページ番号の配列生成（1 ... 4 5 6 ... 10 のように省略表示）
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-100 ${className}`}>
            <div className="text-xs text-slate-500 font-medium">
                全 <strong className="text-slate-900 font-bold font-mono">{totalItems}</strong> 件中{" "}
                <span className="font-mono text-slate-800 font-bold">{startItem}</span> 〜{" "}
                <span className="font-mono text-slate-800 font-bold">{endItem}</span> 件を表示
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 font-medium shadow-2xs"
                    aria-label="前のページへ"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">前へ</span>
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === "...") {
                            return (
                                <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400 text-xs select-none">
                                    ...
                                </span>
                            );
                        }

                        const pageNum = Number(page);
                        const isActive = pageNum === currentPage;

                        return (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                    isActive
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 font-medium shadow-2xs"
                    aria-label="次のページへ"
                >
                    <span className="hidden sm:inline">次へ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
