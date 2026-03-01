import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Loader2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function ClinicOnboarding({ currentUser }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const freshUser = await base44.auth.me();
        if (freshUser?.clinic_id) {
          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        }
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const clinic = await base44.entities.Clinic.create({
        name: name.trim(),
        owner_email: currentUser.email,
        max_users: 4,
        subscription_status: 'none',
      });

      await base44.functions.invoke('linkUserToClinic', {
        target_user_id: currentUser.id,
        clinic_id: clinic.id,
        clinic_name: clinic.name,
      });

      toast({ title: '¡Clínica creada! Bienvenido a Dental Flow.', duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (error) {
      console.error('Error creando clínica:', error);
      toast({
        title: 'Error al crear la clínica',
        description: error?.message || 'Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const freshUser = await base44.auth.me();
      if (freshUser?.clinic_id) {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      } else {
        toast({
          title: 'Aún no estás vinculado',
          description: 'Pide al administrador que te vincule desde Configuración → Clínica.',
          duration: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
              alt="Dental Flow"
              className="w-16 h-16 rounded-2xl object-cover shadow"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Dental Flow</h1>
          <p className="text-gray-500 text-sm">
            Hola, <strong>{currentUser?.full_name || currentUser?.email}</strong>.
          </p>
        </div>

        {/* Option: create new clinic */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Crear una nueva clínica</p>
              <p className="text-xs text-gray-500">Serás el administrador y podrás invitar a tu equipo.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicName">Nombre de la clínica</Label>
            <Input
              id="clinicName"
              placeholder="Ej: Clínica Dental López"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
              disabled={loading}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando clínica...</>
              : 'Crear mi clínica y empezar'}
          </Button>
        </div>

        {/* Option: already invited */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">¿Te han invitado a una clínica?</p>
              <p className="text-xs text-amber-700">
                El administrador te debe vincular desde <strong>Configuración → Clínica</strong>. Una vez hecho, pulsa el botón.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Ya me han vinculado — Comprobar acceso
          </Button>
        </div>

      </div>
    </div>
  );
}