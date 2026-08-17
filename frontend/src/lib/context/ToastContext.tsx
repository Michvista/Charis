'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextType = {
  toast: (title: string, description?: string, type?: ToastType) => void;
  toastSuccess: (title: string, description?: string) => void;
  toastError: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = (title: string, description?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const toastSuccess = (title: string, description?: string) => toast(title, description, 'success');
  const toastError = (title: string, description?: string) => toast(title, description, 'error');

  return (
    <ToastContext.Provider value={{ toast, toastSuccess, toastError }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 ${
                t.type === 'success'
                  ? 'bg-white/95 border-emerald-200 text-emerald-950'
                  : t.type === 'error'
                  ? 'bg-white/95 border-red-200 text-red-950'
                  : 'bg-white/95 border-[#d9c1c0] text-[#1e1b18]'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info size={18} className="text-[#380208] shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wider font-sans">{t.title}</h4>
                {t.description && <p className="text-xs mt-0.5 text-[#544342] leading-relaxed">{t.description}</p>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-[#867272] hover:text-[#1e1b18] p-0.5 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
