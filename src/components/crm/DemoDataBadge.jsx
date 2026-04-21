import React, { useState, useEffect } from 'react';
import { FlaskConical, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Shows a "Datos de ejemplo" badge + delete button while all patients are demo-seeded.
 * Disappears when the user creates their first real patient or deletes demo data.
 */
export default function DemoDataBadge({ patients, clinicId }) {
  const [firstRealJustCreated, setFirstRealJustCreated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const realPatients = patients.filter(p => !p.is_demo);
  const demoPatients = patients.filter(p => p.is_demo);
  const onlyDemoData = demoPatients.length > 0 && realPatients.length === 0;
  const hasFirstReal = realPatients.length > 0;

  // Detect moment user created first real patient
  useEffect(() => {
    if (hasFirstReal && !dismissed) {
      setFirstRealJustCreated(true);
      const timer = setTimeout(() => {
        setFirstRealJustCreated(false);
        setDismissed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasFirstReal]);

  const handleDeleteDemo = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar los ${demoPatients.length} pacientes de ejemplo? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    await Promise.all(demoPatients.map(p => base44.entities.Patient.delete(p.id)));
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    setDeleting(false);
    setDismissed(true);
  };

  if (firstRealJustCreated) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 animate-pulse">
        🎉 ¡Tu primer paciente real! Los datos de ejemplo siguen ahí para referencia.
      </span>
    );
  }

  if (!onlyDemoData || dismissed) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
        <FlaskConical className="w-3.5 h-3.5" />
        Datos de ejemplo
      </span>
      <button
        onClick={handleDeleteDemo}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        {deleting ? 'Borrando...' : 'Borrar datos de prueba'}
      </button>
    </div>
  );
}