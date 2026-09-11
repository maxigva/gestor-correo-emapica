import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Topbar({ children }) {
  const { usuario, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <h1>Gestor de Cuentas de Correo</h1>
          <p className="brand-sub">emapica.com.pe · monitoreo de almacenamiento</p>
        </div>
      </div>

      <nav className="topbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Configuración
        </NavLink>
      </nav>

      <div className="topbar-actions">
        {children}
        <span className="current-user" title={`Conectado como ${usuario}`}>{usuario}</span>
        <button className="btn btn-ghost" onClick={logout}>Salir</button>
      </div>
    </header>
  );
}
