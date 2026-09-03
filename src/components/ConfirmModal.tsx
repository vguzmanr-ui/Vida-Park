import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#CBD9CC] rounded-2xl w-full max-w-md relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isDestructive
                  ? 'bg-red-50 text-red-600 border border-red-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}
            >
              {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-[#1E3A34] mb-1.5 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-[#6C8079] leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#EFF4EF] px-6 py-3.5 border-t border-[#E1E9E1] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white hover:bg-[#F3F7F3] border border-[#CBD9CC] text-[#1E3A34] px-4 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-semibold transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition cursor-pointer shadow-xs ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#1E3A34] hover:bg-[#2C4F47] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
