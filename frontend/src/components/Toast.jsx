import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const mostrarToast = useCallback((mensaje, tipo = 'info') => {
    clearTimeout(timeoutRef.current);
    setToast({ mensaje, tipo });
    timeoutRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={mostrarToast}>
      {children}
      <div className={`toast ${toast ? 'show' : ''} ${toast?.tipo === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
        {toast?.mensaje}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
