import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function ClinicOnboarding({ currentUser }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const clinic = await base44.entities.Clinic.create({
      name: name.trim(),
      owner_email: currentUser.email,
      max_users: 4,
      subscription_status: 'none',
    });

    await base44.auth.updateMe({
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      is_clinic_owner: true,
    });

    toast({ title: '¡Clínica creada! Bienvenido a Dental Flow.', duration: 3000 });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* Logo / Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
              alt="Dental Flow"
              className="w-16 h-16 rounded-2xl object-cover shadow"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Dental Flow</h1>
          <p className="text-gray-500 text-sm">Hola, <strong>{currentUser?.full_name || currentUser?.email}</strong>. Para empezar, crea tu clínica.</p>
        </div>

        {/* Create clinic card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Crea tu clínica</p>
              <p className="text-xs text-gray-500">Serás el administrador y podrás invitar hasta 4 usuarios.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicName">Nombre de la clínica</Label>
            <Input
              id="clinicName"
              placeholder="Ej: Clínica Dental López"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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

        {/* Invited user notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
          <Users className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">¿Te han invitado a una clínica?</p>
            <p>Pide al administrador de tu clínica que te vincule desde <strong>Configuración → Clínica</strong>. En cuanto lo haga, podrás acceder directamente sin necesidad de crear una clínica nueva.</p>
          </div>
        </div>

      </div>
    </div>
  );
}