import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '../components/crm/usePermissions';
import SystemConfigManager from '../components/crm/SystemConfigManager';
import UserManagement from '../components/crm/UserManagement';
import ResponsibleManager from '../components/crm/ResponsibleManager';

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

  const { data: systemConfig = [], refetch: refetchSystemConfig } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => base44.entities.SystemConfig.list()
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const permissions = usePermissions(currentUser);

  // Load config values
  useEffect(() => {
    const daysNoMovementConfig = config.find(c => c.config_key === 'days_no_movement');
    const daysInNegotiationConfig = config.find(c => c.config_key === 'days_in_negotiation');
    
    if (daysNoMovementConfig) setDaysNoMovement(daysNoMovementConfig.config_value);
    if (daysInNegotiationConfig) setDaysInNegotiation(daysInNegotiationConfig.config_value);
  }, [config]);

  // Seed default patient types if not present
  useEffect(() => {
    if (!systemConfig || systemConfig.length === 0) return;

    const defaultPatientTypes = [
      { value: 'primera_visita', label: 'Primera visita' },
      { value: 'old_contact',   label: 'Contacto antiguo' },
      { value: 'referencia',    label: 'Referencia' },
      { value: 'ampliacion',    label: 'Ampliación de tratamiento' },
    ];

    const existingValues = systemConfig
      .filter(c => c.config_type === 'patient_type')
      .map(c => c.value);

    const missing = defaultPatientTypes.filter(pt => !existingValues.includes(pt.value));

    if (missing.length > 0) {
      Promise.all(
        missing.map((pt, i) =>
          base44.entities.SystemConfig.create({
            config_type: 'patient_type',
            value: pt.value,
            label: pt.label,
            is_active: true,
            order: i,
          })
        )
      ).then(() => refetchSystemConfig());
    }
  }, [systemConfig]);

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

  const treatments = systemConfig.filter(c => c.config_type === 'treatment' && c.is_active);
  const rejectionReasons = systemConfig.filter(c => c.config_type === 'rejection_reason' && c.is_active);
  const sources = systemConfig.filter(c => c.config_type === 'source' && c.is_active);
  const patientTypes = systemConfig.filter(c => c.config_type === 'patient_type' && c.is_active);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="responsibles">Responsables</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
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

            {/* Save button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="responsibles" className="space-y-6">
            <ResponsibleManager />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemConfigManager
              configType="treatment"
              title="Tratamientos"
              description="Gestiona los tipos de tratamiento disponibles"
              items={treatments}
              onRefresh={refetchSystemConfig}
            />
            
            <SystemConfigManager
              configType="rejection_reason"
              title="Motivos de rechazo"
              description="Gestiona los motivos por los que un paciente rechaza el tratamiento"
              items={rejectionReasons}
              onRefresh={refetchSystemConfig}
            />
            
            <SystemConfigManager
              configType="source"
              title="Fuentes de captación"
              description="Gestiona las fuentes de dónde provienen los pacientes"
              items={sources}
              onRefresh={refetchSystemConfig}
            />

            <SystemConfigManager
              configType="patient_type"
              title="Tipos de paciente"
              description="Gestiona los tipos de paciente disponibles"
              items={patientTypes}
              onRefresh={refetchSystemConfig}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement 
              users={users}
              onRefresh={refetchUsers}
              currentUser={currentUser}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}