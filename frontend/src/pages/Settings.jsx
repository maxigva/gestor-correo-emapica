import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { Topbar } from '../components/Topbar';

const CAMPOS_CONEXION = [
  { name: 'DA_HOST', label: 'Host', placeholder: 'mail.emapica.com.pe' },
  { name: 'DA_PORT', label: 'Puerto', placeholder: '2222' },
  { name: 'DA_DOMAIN', label: 'Dominio', placeholder: 'emapica.com.pe' },
  { name: 'DA_USERNAME', label: 'Usuario', placeholder: 'usuario DirectAdmin' },
  { name: 'DA_LOGIN_KEY', label: 'Login key', placeholder: 'Dejar vacío para no cambiar', type: 'password' },
];

export function Settings() {
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const mostrarToast = useToast();

  useEffect(() => {
    api.get('/settings').then(setForm).catch((err) => mostrarToast(err.message, 'error'));
  }, []);

  const onChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = { ...form };
      if (!payload.DA_LOGIN_KEY || payload.DA_LOGIN_KEY.includes('•')) delete payload.DA_LOGIN_KEY;
      const actualizado = await api.put('/settings', payload);
      setForm(actualizado);
      mostrarToast('Configuración guardada.');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (!form) return (
    <>
      <Topbar />
      <main><p className="page-loading">Cargando configuración…</p></main>
    </>
  );

  return (
    <>
      <Topbar />
      <main className="settings-main">
        <form className="settings-form" onSubmit={onSubmit}>
          <fieldset>
            <legend>Conexión a DirectAdmin</legend>
            {CAMPOS_CONEXION.map((c) => (
              <label key={c.name}>
                {c.label}
                <input
                  type={c.type || 'text'}
                  placeholder={c.placeholder}
                  value={c.type === 'password' ? '' : (form[c.name] ?? '')}
                  onChange={(e) => onChange(c.name, e.target.value)}
                />
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Umbrales de alerta (%)</legend>
            <label>
              Alerta
              <input type="number" min="1" max="100" value={form.THRESHOLD_WARNING ?? ''}
                onChange={(e) => onChange('THRESHOLD_WARNING', e.target.value)} />
            </label>
            <label>
              Crítico
              <input type="number" min="1" max="100" value={form.THRESHOLD_CRITICAL ?? ''}
                onChange={(e) => onChange('THRESHOLD_CRITICAL', e.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Sincronización automática</legend>
            <label>
              Expresión cron
              <input type="text" placeholder="0 7 * * *" value={form.SYNC_CRON ?? ''}
                onChange={(e) => onChange('SYNC_CRON', e.target.value)} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.SYNC_AUTO_ENABLED === 'true'}
                onChange={(e) => onChange('SYNC_AUTO_ENABLED', String(e.target.checked))} />
              Activada
            </label>
          </fieldset>

          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </main>
    </>
  );
}
