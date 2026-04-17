import React, { useState, useEffect } from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Shows a "Datos de ejemplo" badge while all patients are demo-seeded.
 * Disappears (with a toast-like message) when the user creates their first real patient.
 */
export default function DemoDataBadge({ patients, clinicId }) {
  const [firstRealJustCreated, setFirstRealJustCreated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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

  if (firstRealJustCreated) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 animate-pulse">
        🎉 ¡Tu primer paciente real! Los datos de ejemplo siguen ahí para referencia.
      </span>
    );
  }

  if (!onlyDemoData || dismissed) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
      <FlaskConical className="w-3.5 h-3.5" />
      Datos de ejemplo
    </span>
  );
}