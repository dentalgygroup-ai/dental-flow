import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function ClinicSetup({ currentUser, onClinicCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

    toast({ title: 'Clínica creada correctamente', duration: 3000 });
    onClinicCreated(clinic);
    setLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Configura tu clínica</CardTitle>
            <CardDescription>Es el primer paso para empezar con Dental Flow</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : 'Crear clínica'}
        </Button>
      </CardContent>
    </Card>
  );
}