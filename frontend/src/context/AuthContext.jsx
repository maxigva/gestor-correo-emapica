import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const verificarSesion = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUsuario(data.usuario);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { verificarSesion(); }, [verificarSesion]);

  const login = async (usuario, password) => {
    const data = await api.post('/auth/login', { usuario, password });
    setUsuario(data.usuario);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
