import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../components/crm/usePermissions';

export default function Settings() {
  const [daysNoMovement, setDaysNoMovement] = useState(7);
  const [daysInNegotiation, setDaysInNegotiation] = useState(14);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: config = [], refetch: refetchConfig } = useQuery({
    queryKey: ['appConfig'],
    queryFn: () => base44.entities.AppConfig.list()
  });

  const permissions = usePermissions(currentUser);

  // Load config values
  useEffect(() => {
    const daysNoMovementConfig = config.find(c => c.config_key === 'days_no_movement');
    const daysInNegotiationConfig = config.find(c => c.config_key === 'days_in_negotiation');
    
    if (daysNoMovementConfig) setDaysNoMovement(daysNoMovementConfig.config_value);
    if (daysInNegotiationConfig) setDaysInNegotiation(daysInNegotiationConfig.config_value);
  }, [config]);

  const handleSave = async () => {
    if (!permissions.canConfig) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden cambiar la configuración",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    // Update or create days_no_movement
    const daysNoMovementConfig = config.find(c => c.config_key === 'days_no_movement');
    if (daysNoMovementConfig) {
      await base44.entities.AppConfig.update(daysNoMovementConfig.id, {
        config_value: parseInt(daysNoMovement)
      });
    } else {
      await base44.entities.AppConfig.create({
        config_key: 'days_no_movement',
        config_value: parseInt(daysNoMovement),
        description: 'Días sin movimiento para alerta'
      });
    }

    // Update or create days_in_negotiation
    const daysInNegotiationConfig = config.find(c => c.config_key === 'days_in_negotiation');
    if (daysInNegotiationConfig) {
      await base44.entities.AppConfig.update(daysInNegotiationConfig.id, {
        config_value: parseInt(daysInNegotiation)
      });
    } else {
      await base44.entities.AppConfig.create({
        config_key: 'days_in_negotiation',
        config_value: parseInt(daysInNegotiation),
        description: 'Días en negociación para alerta'
      });
    }

    await refetchConfig();
    setIsSaving(false);

    toast({
      title: "Configuración guardada",
      duration: 3000
    });
  };

  if (!permissions.canConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Acceso restringido</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Solo los administradores pueden acceder a la configuración.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500">
              Ajustes del sistema CRM
            </p>
          </div>
        </div>

        {/* Alert thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Umbrales de alerta</CardTitle>
            <CardDescription>
              Configura los días para mostrar alertas visuales en las tarjetas de pacientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="daysNoMovement">
                Días sin movimiento para alerta
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="daysNoMovement"
                  type="number"
                  min="1"
                  max="90"
                  value={daysNoMovement}
                  onChange={(e) => setDaysNoMovement(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">días</span>
              </div>
              <p className="text-xs text-gray-400">
                Se mostrará un indicador ámbar en pacientes sin actividad durante este tiempo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysInNegotiation">
                Días en negociación para alerta
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="daysInNegotiation"
                  type="number"
                  min="1"
                  max="90"
                  value={daysInNegotiation}
                  onChange={(e) => setDaysInNegotiation(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">días</span>
              </div>
              <p className="text-xs text-gray-400">
                Se mostrará un indicador para pacientes en estado "En negociación" durante más de este tiempo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info cards */}
        <Card>
          <CardHeader>
            <CardTitle>Opciones del sistema</CardTitle>
            <CardDescription>
              Las siguientes opciones están configuradas por defecto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 text-sm">Tratamientos</h4>
              <p className="text-xs text-gray-500 mt-1">
                Implantes, Ortodoncia, Estética, General
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 text-sm">Motivos de rechazo</h4>
              <p className="text-xs text-gray-500 mt-1">
                Precio, Tiempo, Competencia, No interesado, Sin financiación, Otro
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 text-sm">Fuentes de captación</h4>
              <p className="text-xs text-gray-500 mt-1">
                Walk-in, Web, Referido, Campaña, Redes sociales, Otro
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </div>
    </div>
  );
}