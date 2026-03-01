import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Crown, Loader2, AlertCircle, Calendar, CreditCard, X, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';

const STATUS_LABELS = {
  trialing: { label: 'Período de prueba', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Activa', color: 'bg-green-100 text-green-700' },
  past_due: { label: 'Pago pendiente', color: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-700' },
  none: { label: 'Sin suscripción', color: 'bg-gray-100 text-gray-700' },
};

export default function SubscriptionManager({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const { toast } = useToast();

  const clinicId = currentUser?.clinic_id;

  const { data: clinic, refetch: refetchClinic } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      const clinics = await base44.entities.Clinic.filter({ id: clinicId });
      return clinics[0] || null;
    },
    enabled: !!clinicId,
  });

  const { data: clinicUsers = [] } = useQuery({
    queryKey: ['clinicUsers', clinicId],
    queryFn: () => clinicId ? base44.entities.User.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  // Handle return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      refetchClinic();
      toast({ title: '¡Suscripción activada! Bienvenido a Dental Flow Pro.', duration: 4000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    const returnUrl = window.location.href;
    const cancelUrl = window.location.href;

    const res = await base44.functions.invoke('stripeSubscription', {
      action: 'create_checkout',
      plan: selectedPlan,
      clinic_id: clinicId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    });

    if (res.data.url) {
      window.location.href = res.data.url;
    } else {
      toast({ title: 'Error al crear la sesión de pago', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    // If no stripe_customer_id, the clinic is on a free trial and hasn't subscribed via Stripe yet
    if (!clinic?.stripe_customer_id) {
      toast({ title: 'Aún no tienes una suscripción activa de pago. Suscríbete primero para gestionar la facturación.', duration: 5000 });
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('stripeSubscription', {
        action: 'portal',
        clinic_id: clinicId,
        return_url: window.location.href,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast({ title: 'Error al abrir el portal de facturación', variant: 'destructive' });
        setLoading(false);
      }
    } catch (e) {
      toast({ title: 'Error al abrir el portal de facturación', variant: 'destructive' });
      setLoading(false);
    }
  };

  if (!clinicId) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">Primero debes configurar tu clínica en la pestaña de Clínica.</p>
      </div>
    );
  }

  if (!clinic) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const isActive = clinic.subscription_status === 'active' || clinic.subscription_status === 'trialing';
  const statusInfo = STATUS_LABELS[clinic.subscription_status] || STATUS_LABELS.none;
  const userCount = clinicUsers.length;

  return (
    <div className="space-y-6">
      {/* Clinic & subscription status */}
      <Card className={`border-2 ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {isActive ? <Crown className="w-5 h-5 text-amber-500" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
              <div>
                <p className="font-semibold text-gray-900">{clinic.name}</p>
                {clinic.current_period_end && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {clinic.subscription_status === 'trialing' ? 'Prueba hasta: ' : 'Renovación: '}
                    {new Date(clinic.current_period_end).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {isActive && (
            <div className="flex items-center gap-2 text-sm text-gray-600 ml-8">
              <Users className="w-4 h-4" />
              <span>{userCount} / {clinic.max_users} usuarios</span>
              <span className="text-gray-400">·</span>
              <span>Plan {clinic.subscription_plan === 'annual' ? 'Anual — 124,50€/año' : 'Mensual — 14,95€/mes'}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active subscription: manage billing */}
      {isActive && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Gestiona tu facturación, método de pago o cancela desde el portal de Stripe.</p>
          <Button variant="outline" onClick={handleManageBilling} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Gestionar facturación
          </Button>
        </div>
      )}

      {/* No active subscription: show plans */}
      {!isActive && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Elige tu plan</h3>
            <p className="text-sm text-gray-500">7 días gratis. Hasta 4 usuarios por clínica. Cancela cuando quieras.</p>
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
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Hasta 4 usuarios</li>
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
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Hasta 4 usuarios</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acceso completo al CRM</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2 meses gratis vs mensual</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Button className="w-full mt-5 h-12 text-base gap-2" onClick={handleSubscribe} disabled={loading}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a Stripe...</>
              : <><CreditCard className="w-4 h-4" /> Empezar prueba gratuita de 7 días</>}
          </Button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Pago gestionado de forma segura a través de Stripe. Sin cargos durante la prueba.
          </p>
        </div>
      )}
    </div>
  );
}