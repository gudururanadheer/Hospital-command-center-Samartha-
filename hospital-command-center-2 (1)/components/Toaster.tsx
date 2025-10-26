import React, { useState, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastCount = 0;
const toastListeners = new Set<(toast: ToastMessage) => void>();

const toast = {
  success: (message: string) => {
    emitToast({ id: toastCount++, message, type: 'success' });
  },
  error: (message: string) => {
    emitToast({ id: toastCount++, message, type: 'error' });
  },
  info: (message: string) => {
    emitToast({ id: toastCount++, message, type: 'info' });
  },
};

function emitToast(toast: ToastMessage) {
  toastListeners.forEach(listener => listener(toast));
}

const Toast: React.FC<{ message: ToastMessage; onDismiss: (id: number) => void }> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(message.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const baseClasses = "flex items-center w-full max-w-sm p-4 mb-4 text-slate-100 bg-slate-800 rounded-lg shadow-lg border-l-4";
  const typeClasses = {
    success: 'border-green-500',
    error: 'border-red-500',
    info: 'border-blue-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[message.type]}`} role="alert">
      <div className="ml-3 text-sm font-medium">{message.message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-slate-400 hover:text-slate-100 rounded-lg focus:ring-2 focus:ring-slate-500 p-1.5 hover:bg-slate-700 inline-flex h-8 w-8"
        onClick={() => onDismiss(message.id)}
      >
        <span className="sr-only">Close</span>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      </button>
    </div>
  );
};

const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const addToast = (toast: ToastMessage) => {
      setToasts(currentToasts => [toast, ...currentToasts]);
    };

    toastListeners.add(addToast);
    return () => {
      toastListeners.delete(addToast);
    };
  }, []);
  
  const onDismiss = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
  }, []);

  return (
    <div className="fixed top-5 right-5 z-50">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export { Toaster, toast };
