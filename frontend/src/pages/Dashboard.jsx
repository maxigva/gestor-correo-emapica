import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { Topbar } from '../components/Topbar';
import { StatusBadge, SuspendedBadge } from '../components/StatusBadge';
import { UsageGauge } from '../components/UsageGauge';
import { QuotaModal } from '../components/QuotaModal';
import { useSync } from '../hooks/useSync';

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'alerta', label: 'Alerta ≥70%' },
  { id: 'critico', label: 'Crítico ≥90%' },
  { id: 'suspendida', label: 'Suspendidas' },
];

function formatMb(mb) {
  if (mb === null || mb === undefined) return '—';
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

export function Dashboard() {
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState({ campo: 'porcentaje', dir: 'desc' });
  const [ultimaSync, setUltimaSync] = useState(null);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [exportando, setExportando] = useState(false);
  const mostrarToast = useToast();

  const cargar = async () => {
    try {
      const d = await api.get('/dashboard');
      setData(d);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  useEffect(() => { cargar(); }, []);

  const { sincronizar, sincronizando } = useSync((res) => {
    setUltimaSync(new Date());
    cargar();
  });

  const exportarCsv = async () => {
    setExportando(true);
    try {
      const res = await fetch('/api/accounts/export', { credentials: 'include' });
      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch { }
        throw new Error(data?.error || `Error ${res.status}`);
      }
      const nombre = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'cuentas-emapica.csv';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setExportando(false);
    }
  };

  const cuentasFiltradas = useMemo(() => {
    if (!data) return [];
    let out = data.cuentas;

    if (filtro === 'alerta') out = out.filter((c) => c.estado === 'alerta' || c.estado === 'critico');
    if (filtro === 'critico') out = out.filter((c) => c.estado === 'critico');
    if (filtro === 'suspendida') out = out.filter((c) => c.suspendida);

    if (busqueda) {
      const q = busqueda.toLowerCase();
      out = out.filter((c) => c.usuario.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    }

    const { campo, dir } = orden;
    out = [...out].sort((a, b) => {
      const av = a[campo] ?? -Infinity;
      const bv = b[campo] ?? -Infinity;
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return out;
  }, [data, filtro, busqueda, orden]);

  const cambiarOrden = (campo) => {
    setOrden((prev) => prev.campo === campo
      ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: 'desc' });
  };

  return (
    <>
      <Topbar>
        <span className="last-sync">
          {ultimaSync ? `Última sync: ${ultimaSync.toLocaleString('es-PE')}` : 'Sin sincronizar en esta sesión'}
        </span>
        <button className="btn btn-ghost" onClick={exportarCsv} disabled={exportando}>
          Exportar CSV
        </button>
        <button className={`btn btn-primary ${sincronizando ? 'is-loading' : ''}`} onClick={sincronizar} disabled={sincronizando}>
          <span className="btn-icon">⟳</span> Sincronizar ahora
        </button>
      </Topbar>

      <main>
        <section className="summary" aria-label="Resumen">
          <article className="card card-total">
            <span className="card-label">Cuentas monitoreadas</span>
            <span className="card-value">{data?.totalCuentas ?? '—'}</span>
          </article>
          <article className="card card-warning">
            <span className="card-label">En alerta (≥70%)</span>
            <span className="card-value">{data?.enAlerta ?? '—'}</span>
          </article>
          <article className="card card-critical">
            <span className="card-label">Críticas (≥90%)</span>
            <span className="card-value">{data?.criticas ?? '—'}</span>
          </article>
        </section>

        <section className="controls">
          <div className="tabs" role="tablist" aria-label="Filtrar cuentas">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={`tab ${filtro === f.id ? 'active' : ''}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Buscar cuenta o correo…"
            className="search-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </section>

        <section className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => cambiarOrden('usuario')}>Cuenta</th>
                <th onClick={() => cambiarOrden('mbUsado')}>Uso</th>
                <th className="col-gauge">Nivel</th>
                <th onClick={() => cambiarOrden('porcentaje')}>%</th>
                <th onClick={() => cambiarOrden('mensajesUsado')}>Mensajes</th>
                <th>Estado</th>
                <th className="col-actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr><td colSpan={7} className="empty-state">Cargando datos…</td></tr>
              )}
              {data && cuentasFiltradas.length === 0 && (
                <tr><td colSpan={7} className="empty-state">No hay cuentas que coincidan con el filtro.</td></tr>
              )}
              {cuentasFiltradas.map((c) => (
                <tr key={c.usuario}>
                  <td>
                    <span className="acc-user">{c.usuario}</span>
                    <span className="acc-email">{c.email}</span>
                  </td>
                  <td className="mono">
                    {formatMb(c.mbUsado)} / {c.mbCuota === null ? '∞' : `${formatMb(c.mbCuota)}`}
                  </td>
                  <td className="col-gauge">
                    <UsageGauge porcentaje={c.porcentaje} estado={c.estado} />
                  </td>
                  <td className="mono">{c.porcentaje === null ? '—' : `${c.porcentaje}%`}</td>
                  <td className="mono">{c.mensajesUsado} / {c.mensajesLimite === null ? '∞' : c.mensajesLimite}</td>
                  <td>
                    <StatusBadge estado={c.estado} />
                    {c.suspendida && <SuspendedBadge />}
                  </td>
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn-row"
                      onClick={() => setCuentaEditando(c)}
                      title={`Modificar cuota de ${c.usuario}`}
                      aria-label={`Modificar cuota de ${c.usuario}`}
                    >
                      ✎ Cuota
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <QuotaModal
        cuenta={cuentaEditando}
        onClose={() => setCuentaEditando(null)}
        onSuccess={() => {
          setCuentaEditando(null);
          cargar();
        }}
      />
    </>
  );
}
