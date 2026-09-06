import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

export function useSync(onSuccess) {
  const [sincronizando, setSincronizando] = useState(false);
  const mostrarToast = useToast();

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const data = await api.post('/sync');
      mostrarToast(`Sincronizado: ${data.cuentasTotal} cuentas actualizadas.`);
      onSuccess?.(data);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setSincronizando(false);
    }
  };

  return { sincronizar, sincronizando };
}
