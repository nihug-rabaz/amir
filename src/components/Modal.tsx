'use client';
import { useEffect, type ReactNode } from 'react';
import { IconX } from './Icon';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

// Generic centered modal with backdrop, body scroll lock and Escape-to-close.
export function Modal({ open, title, subtitle, onClose, children, footer, width = '560px' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto" style={{ background: 'rgba(8,16,28,0.55)' }} onMouseDown={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full my-auto"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 m-0 truncate">{title}</h3>
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="סגור" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0">
            <IconX size={18} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
