const LABELS = {
  normal: 'Normal',
  alerta: 'Alerta',
  critico: 'Crítico',
  sin_limite: 'Sin límite',
};

export function StatusBadge({ estado }) {
  return <span className={`badge badge-${estado}`}>{LABELS[estado] || estado}</span>;
}

export function SuspendedBadge() {
  return <span className="badge badge-suspendida">Suspendida</span>;
}
