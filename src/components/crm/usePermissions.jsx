import { useMemo } from 'react';
import { ROLES } from './constants';

export function usePermissions(user) {
  return useMemo(() => {
    const role = user?.role || 'solo_lectura';
    const permissions = ROLES[role] || ROLES.solo_lectura;
    
    return {
      role,
      roleLabel: permissions.label,
      canEdit: permissions.canEdit,
      canCreate: permissions.canCreate,
      canMove: permissions.canMove,
      canExport: permissions.canExport,
      canConfig: permissions.canConfig,
      canEditBudget: permissions.canEditBudget,
      isAdmin: role === 'admin',
      isReadOnly: role === 'solo_lectura'
    };
  }, [user?.role]);
}