import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Users, Mail, Trash2, UserPlus, Loader2, Crown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ClinicSetup from './ClinicSetup';

export default function ClinicManager({ currentUser }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: clinicUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['clinicUsers', clinicId],
    queryFn: () => clinicId ? base44.entities.User.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  const handleClinicCreated = (newClinic) => {
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['clinic'] });
    refetchClinic();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    const maxUsers = clinic?.max_users || 4;
    if (clinicUsers.length >= maxUsers) {
      toast({
        title: `Límite alcanzado`,
        description: `Tu clínica ya tiene el máximo de ${maxUsers} usuarios.`,
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);

    const email = inviteEmail.trim().toLowerCase();

    // 1. Send invitation email
    await base44.users.inviteUser(email, 'user');

    // 2. Check if user already exists → link immediately
    const allUsers = await base44.entities.User.list();
    const existingUser = allUsers.find(u => u.email?.toLowerCase() === email);
    if (existingUser && !existingUser.clinic_id) {
      await base44.functions.invoke('linkUserToClinic', {
        target_user_id: existingUser.id,
        clinic_id: clinicId,
        clinic_name: clinic.name,
      });
    } else if (!existingUser) {
      // 3. User doesn't exist yet → save pending invite so it auto-links on first login
      // Remove any previous pending invite for this email first
      const existing = await base44.entities.PendingInvite.filter({ email });
      await Promise.all(existing.map(i => base44.entities.PendingInvite.delete(i.id)));
      await base44.entities.PendingInvite.create({
        email,
        clinic_id: clinicId,
        clinic_name: clinic.name,
        invited_by: currentUser?.email,
      });
    }

    toast({ title: `Invitación enviada a ${email}`, duration: 3000 });
    setInviteEmail('');
    refetchUsers();
    setInviting(false);
  };

  const handleRemoveUser = async (user) => {
    if (!confirm(`¿Eliminar a ${user.full_name || user.email} de la clínica?`)) return;
    await base44.entities.User.update(user.id, { clinic_id: null, clinic_name: null, is_clinic_owner: false });
    refetchUsers();
    toast({ title: 'Usuario eliminado de la clínica', duration: 2000 });
  };

  if (!clinicId) {
    return <ClinicSetup currentUser={currentUser} onClinicCreated={handleClinicCreated} />;
  }

  if (!clinic) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const isOwner = currentUser?.is_clinic_owner;
  const maxUsers = clinic.max_users || 4;
  const isAtLimit = clinicUsers.length >= maxUsers;

  return (
    <div className="space-y-6">
      {/* Clinic info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>{clinic.name}</CardTitle>
              <CardDescription>Propietario: {clinic.owner_email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{clinicUsers.length} / {maxUsers} usuarios</span>
          </div>
        </CardContent>
      </Card>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios de la clínica</CardTitle>
          <CardDescription>Máximo {maxUsers} usuarios por clínica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clinicUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              {u.is_clinic_owner && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                  <Crown className="w-3 h-3" /> Propietario
                </Badge>
              )}
              {isOwner && !u.is_clinic_owner && u.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveUser(u)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {clinicUsers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No hay usuarios en la clínica todavía.</p>
          )}
        </CardContent>
      </Card>

      {/* Invite user */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invitar usuario
            </CardTitle>
            <CardDescription>
              {isAtLimit
                ? `Has alcanzado el límite de ${maxUsers} usuarios.`
                : `Puedes añadir ${maxUsers - clinicUsers.length} usuario(s) más.`}
            </CardDescription>
          </CardHeader>
          {!isAtLimit && (
            <CardContent className="flex gap-3">
              <Input
                type="email"
                placeholder="email@clinica.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="gap-2">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Invitar
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}