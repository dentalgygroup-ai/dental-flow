import React from 'react';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TrialBanner({ trialEndDate }) {
  const now = new Date();
  const end = new Date(trialEndDate);
  const msLeft = end - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
      isUrgent
        ? 'bg-amber-50 text-amber-700 border-b border-amber-200'
        : 'bg-blue-50 text-blue-600 border-b border-blue-100'
    }`}>
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Estás en tu período de prueba gratuito.{' '}
        <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong> restante{daysLeft === 1 ? '' : 's'}.{' '}
      </span>
      <Link
        to="/Settings"
        className={`underline font-semibold hover:opacity-80 transition-opacity ${isUrgent ? 'text-amber-800' : 'text-blue-700'}`}
      >
        Activar suscripción →
      </Link>
    </div>
  );
}