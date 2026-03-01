import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function TrialExpiredWall({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const { toast } = useToast();

  const clinicId = currentUser?.clinic_id;

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

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast({ title: 'Error al crear la sesión de pago', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo & heading */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
              alt="Dental Flow"
              className="w-12 h-12 rounded-xl"
            />
            <span className="text-2xl font-light text-gray-800" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Dental Flow
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tu período de prueba ha finalizado
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Suscríbete y sigue disfrutando de todas las prestaciones de Dental Flow sin interrupciones.
          </p>
        </div>

        {/* Features reminder */}
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600">
          {['Pipeline comercial', 'Gestión de pacientes', 'Tareas y calendario', 'Estadísticas', 'Hasta 4 usuarios'].map(f => (
            <span key={f} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <Check className="w-3.5 h-3.5 text-green-500" />
              {f}
            </span>
          ))}
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
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
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Hasta 4 usuarios</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acceso completo al CRM</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2 meses gratis vs mensual</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Button className="w-full h-12 text-base gap-2" onClick={handleSubscribe} disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a Stripe...</>
            : <><CreditCard className="w-4 h-4" /> Suscribirme ahora</>}
        </Button>
        <p className="text-xs text-gray-400">
          Pago gestionado de forma segura a través de Stripe.
        </p>
      </div>
    </div>
  );
}