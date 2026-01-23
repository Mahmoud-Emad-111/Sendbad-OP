import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">

        <div className="flex items-start justify-between mb-4">
            <div className="grid place-items-center w-12 h-12 rounded-full bg-red-50 text-red-500">
                <AlertTriangle size={24} />
            </div>
            <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
                <X size={20} />
            </button>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
            {title}
        </h3>

        <p className="text-slate-500 mb-8 leading-relaxed">
            {message}
        </p>

        <div className="flex items-center gap-3">
            <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? (
                    'Deleting...'
                ) : (
                    <>
                        <Trash2 size={18} />
                        Delete
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
