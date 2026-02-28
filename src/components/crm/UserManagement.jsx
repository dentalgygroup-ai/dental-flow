import React from 'react';
import { Mail, Shield } from 'lucide-react';
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
  const { toast } = useToast();

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
        <CardTitle>Gestión de usuarios</CardTitle>
        <CardDescription>
          Los usuarios se invitan desde la sección <strong>Clínica</strong>. Aquí puedes gestionar sus roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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