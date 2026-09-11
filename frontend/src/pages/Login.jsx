import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { usuario, login, cargando } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(form.usuario, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <span className="brand-mark brand-mark-lg" aria-hidden="true" />
        <h1>Gestor de Cuentas de Correo</h1>
        <p className="login-sub">emapica.com.pe</p>

        <label>
          Usuario
          <input
            type="text"
            autoFocus
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="login-hint">
          ¿No tenés cuenta? Pedile a quien administra el servidor que la cree con
          <code> npm run create-user</code>.
        </p>
      </form>
    </div>
  );
}
