import React from 'react';
import { Clock } from 'lucide-react';

export default function TrialBanner({ trialEndDate }) {
  const now = new Date();
  const end = new Date(trialEndDate);
  const msLeft = end - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const urgency = daysLeft <= 2;

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
      urgency
        ? 'bg-orange-50 text-orange-700 border-b border-orange-100'
        : 'bg-blue-50 text-blue-600 border-b border-blue-100'
    }`}>
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Período de prueba —{' '}
        <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong> restante{daysLeft === 1 ? '' : 's'}
        {urgency && ' · ¡Suscríbete para no perder el acceso!'}
      </span>
    </div>
  );
}