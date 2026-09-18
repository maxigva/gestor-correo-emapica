import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useToast } from './Toast';

function QuotaForm({ cuenta, guardando, onCancel, onConfirm }) {
  const [nuevaCuota, setNuevaCuota] = useState(
    cuenta.mbCuota === null ? '' : String(Math.round(cuenta.mbCuota))
  );

  const nuevaCuotaMB = Number(nuevaCuota);
  const valida = nuevaCuota !== '' && Number.isInteger(nuevaCuotaMB) && nuevaCuotaMB > 0;

  const enviar = (e) => {
    e.preventDefault();
    if (valida && !guardando) onConfirm(nuevaCuotaMB);
  };

  return (
    <form onSubmit={enviar}>
      <h2 id="quota-modal-title">Modificar cuota</h2>

      <dl className="modal-info">
        <dt>Cuenta</dt>
        <dd>{cuenta.email || cuenta.usuario}</dd>
        <dt>Cuota actual</dt>
        <dd className="mono">{cuenta.mbCuota === null ? 'Sin límite' : `${cuenta.mbCuota} MB`}</dd>
      </dl>

      <label className="modal-field">
        Nueva cuota (MB)
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          required
          autoFocus
          value={nuevaCuota}
          onChange={(e) => setNuevaCuota(e.target.value)}
          disabled={guardando}
        />
      </label>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className={`btn btn-primary ${guardando ? 'is-loading' : ''}`} disabled={!valida || guardando}>
          {guardando && <span className="btn-icon">⟳</span>} Confirmar
        </button>
      </div>
    </form>
  );
}

export function QuotaModal({ cuenta, onClose, onSuccess }) {
  const dialogRef = useRef(null);
  const [guardando, setGuardando] = useState(false);
  const mostrarToast = useToast();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (cuenta && !dialog.open) dialog.showModal();
    if (!cuenta && dialog.open) dialog.close();
  }, [cuenta]);

  const cerrar = () => {
    if (!guardando) onClose?.();
  };

  const confirmar = async (nuevaCuotaMB) => {
    setGuardando(true);
    try {
      const data = await api.put(`/accounts/${encodeURIComponent(cuenta.usuario)}/quota`, { nuevaCuotaMB });
      mostrarToast(`Cuota de ${cuenta.usuario} actualizada a ${nuevaCuotaMB} MB.`);
      onSuccess?.(data);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(e) => { e.preventDefault(); cerrar(); }}
      aria-labelledby="quota-modal-title"
    >
      {cuenta && (
        <QuotaForm
          key={cuenta.usuario}
          cuenta={cuenta}
          guardando={guardando}
          onCancel={cerrar}
          onConfirm={confirmar}
        />
      )}
    </dialog>
  );
}
