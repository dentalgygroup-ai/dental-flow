import React, { useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function TrialBanner({ trialEndDate }) {
  const [loading, setLoading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const now = new Date();
  const end = new Date(trialEndDate);
  const msLeft = end - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 3;

  const handleActivate = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('stripeSubscription', {
      action: 'create_checkout',
      plan: 'monthly',
      clinic_id: currentUser?.clinic_id,
      return_url: window.location.href,
      cancel_url: window.location.href,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setLoading(false);
    }
  };

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
      <button
        onClick={handleActivate}
        disabled={loading}
        className={`underline font-semibold hover:opacity-80 transition-opacity flex items-center gap-1 ${isUrgent ? 'text-amber-800' : 'text-blue-700'}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activar suscripción →'}
      </button>
    </div>
  );
}