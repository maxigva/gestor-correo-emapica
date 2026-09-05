function claseSegunEstado(estado) {
  if (estado === 'critico') return 'critical';
  if (estado === 'alerta') return 'warning';
  if (estado === 'sin_limite') return '';
  return 'ok';
}

export function UsageGauge({ porcentaje, estado }) {
  const pct = porcentaje === null ? 0 : Math.min(100, porcentaje);
  return (
    <div className="gauge" title={porcentaje === null ? 'sin límite' : `${porcentaje}%`}>
      <div className={`gauge-fill ${claseSegunEstado(estado)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
