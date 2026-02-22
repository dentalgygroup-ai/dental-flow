import React, { useState } from 'react';
import { UserPlus, Mail, Shield, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const ROLE_LABELS = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  comercial: { label: 'Comercial', color: 'bg-blue-100 text-blue-700' },
  recepcion: { label: 'Recepción', color: 'bg-green-100 text-green-700' },
  solo_lectura: { label: 'Solo lectura', color: 'bg-gray-100 text-gray-700' }
};

export default function UserManagement({ users, onRefresh, currentUser }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'comercial' });
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast({
        title: "Error",
        description: "Introduce un email",
        variant: "destructive"
      });
      return;
    }

    setIsInviting(true);

    try {
      await base44.users.inviteUser(inviteData.email, inviteData.role);
      
      setInviteData({ email: '', role: 'comercial' });
      setShowInvite(false);
      
      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${inviteData.email}`,
        duration: 3000
      });

      // Refresh users list
      setTimeout(() => onRefresh(), 1000);
    } catch (error) {
      toast({
        title: "Error al invitar",
        description: error.message || "No se pudo enviar la invitación",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    if (user.email === currentUser?.email) {
      toast({
        title: "No permitido",
        description: "No puedes cambiar tu propio rol",
        variant: "destructive"
      });
      return;
    }

    await base44.entities.User.update(user.id, { role: newRole });
    onRefresh();
    
    toast({
      title: "Rol actualizado",
      duration: 2000
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de usuarios</CardTitle>
            <CardDescription>
              Invita y gestiona los usuarios del sistema
            </CardDescription>
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowInvite(!showInvite)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInvite && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              />
              <Select
                value={inviteData.role}
                onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="recepcion">Recepción</SelectItem>
                  <SelectItem value="solo_lectura">Solo lectura</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleInvite}
                disabled={isInviting}
              >
                <Check className="w-4 h-4 mr-1" />
                {isInviting ? 'Enviando...' : 'Enviar invitación'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setShowInvite(false);
                  setInviteData({ email: '', role: 'comercial' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y">
          {users.map((user) => {
            const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.solo_lectura;
            const isCurrentUser = user.email === currentUser?.email;
            
            return (
              <div key={user.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.full_name || 'Sin nombre'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-500">(Tú)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleUpdateRole(user, value)}
                    disabled={isCurrentUser}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        <Badge className={roleInfo.color}>
                          <Shield className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="recepcion">Recepción</SelectItem>
                      <SelectItem value="solo_lectura">Solo lectura</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}