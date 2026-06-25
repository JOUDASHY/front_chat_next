'use client';

import { useEffect, useState } from 'react';

export interface ChatToastData {
  id: string;
  type: 'message' | 'read' | 'typing';
  title: string;
  body?: string;
  avatar?: string;
}

interface Props {
  toasts: ChatToastData[];
  onDismiss: (id: string) => void;
}

export default function ChatToast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ChatToastData; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Apparition
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss après 3.5s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  const icon = toast.type === 'message' ? '💬' : toast.type === 'read' ? '👁️' : '✏️';
  const bg = toast.type === 'message'
    ? 'bg-white border-indigo-200'
    : toast.type === 'read'
    ? 'bg-white border-blue-200'
    : 'bg-white border-gray-200';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg max-w-xs transition-all duration-300 ${bg} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {/* Avatar ou icône */}
      <div className="shrink-0">
        {toast.avatar ? (
          <img src={toast.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="text-xl">{icon}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{toast.title}</p>
        {toast.body && (
          <p className="text-xs text-gray-500 truncate">{toast.body}</p>
        )}
      </div>

      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="shrink-0 text-gray-300 hover:text-gray-500 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
