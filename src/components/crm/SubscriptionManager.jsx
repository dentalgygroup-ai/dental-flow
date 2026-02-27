import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Crown, Loader2, AlertCircle, Calendar, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABELS = {
  trialing: { label: 'Período de prueba', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Activa', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
};

export default function SubscriptionManager({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [subStatus, setSubStatus] = useState(null);
  const [nextBilling, setNextBilling] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser?.paypal_subscription_id) {
      checkStatus();
    } else {
      setSubStatus(currentUser?.subscription_status || null);
      setStatusLoading(false);
    }
  }, [currentUser]);

  const checkStatus = async () => {
    setStatusLoading(true);
    const res = await base44.functions.invoke('paypalSubscription', { action: 'status' });
    setSubStatus(res.data.subscription_status);
    setNextBilling(res.data.next_billing);
    setStatusLoading(false);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    const returnUrl = window.location.href + '?subscribed=true';
    const cancelUrl = window.location.href + '?cancelled=true';

    const res = await base44.functions.invoke('paypalSubscription', {
      action: 'create',
      plan: selectedPlan,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    });

    if (res.data.approval_url) {
      window.location.href = res.data.approval_url;
    } else {
      toast({ title: 'Error al crear la suscripción', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que quieres cancelar tu suscripción?')) return;
    setLoading(true);
    await base44.functions.invoke('paypalSubscription', { action: 'cancel' });
    toast({ title: 'Suscripción cancelada', duration: 3000 });
    setSubStatus('cancelled');
    setLoading(false);
  };

  // Check if coming back from PayPal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      checkStatus();
      toast({ title: '¡Suscripción activada! Bienvenido a Dental Flow.', duration: 4000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isActive = subStatus === 'active' || subStatus === 'trialing';

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current status */}
      {subStatus && (
        <Card className={`border-2 ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {isActive ? <Crown className="w-5 h-5 text-amber-500" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                <div>
                  <p className="font-semibold text-gray-900">Estado de tu suscripción</p>
                  {nextBilling && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> Próxima renovación: {new Date(nextBilling).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[subStatus]?.color || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[subStatus]?.label || subStatus}
              </span>
            </div>
            {isActive && currentUser?.subscription_plan && (
              <p className="text-sm text-gray-600 mt-3 ml-8">
                Plan actual: <strong>{currentUser.subscription_plan === 'annual' ? 'Anual — 124,50€/año' : 'Mensual — 14,95€/mes'}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      {!isActive && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Elige tu plan</h3>
            <p className="text-sm text-gray-500">7 días gratis. Sin compromiso. Cancela cuando quieras.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly */}
            <Card
              className={`cursor-pointer border-2 transition-all ${selectedPlan === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedPlan('monthly')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Mensual</CardTitle>
                  {selectedPlan === 'monthly' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">14,95€</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </div>
                <p className="text-xs text-blue-600 font-medium">Menos de 1€ al día</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 7 días de prueba gratis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acceso completo al CRM</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Cancela cuando quieras</li>
                </ul>
              </CardContent>
            </Card>

            {/* Annual */}
            <Card
              className={`cursor-pointer border-2 transition-all relative ${selectedPlan === 'annual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedPlan('annual')}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">AHORRA 54,90€</span>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Anual</CardTitle>
                  {selectedPlan === 'annual' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">124,50€</span>
                  <span className="text-gray-500 text-sm">/año</span>
                </div>
                <p className="text-xs text-green-600 font-medium">Equivale a 10,37€/mes</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 7 días de prueba gratis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acceso completo al CRM</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2 meses gratis vs mensual</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Button
            className="w-full mt-5 h-12 text-base gap-2"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a PayPal...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Empezar prueba gratuita de 7 días</>
            )}
          </Button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Pago gestionado de forma segura a través de PayPal. Sin cargos durante la prueba.
          </p>
        </div>
      )}

      {/* Cancel button for active subscriptions */}
      {isActive && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1" onClick={handleCancel} disabled={loading}>
            <X className="w-4 h-4" />
            {loading ? 'Cancelando...' : 'Cancelar suscripción'}
          </Button>
        </div>
      )}
    </div>
  );
}