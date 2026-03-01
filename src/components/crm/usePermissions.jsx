import { useMemo } from 'react';

export function usePermissions(user) {
  return useMemo(() => {
    // is_clinic_owner = full admin within the clinic
    // Platform role 'admin' = super admin (developer)
    const isOwner = user?.is_clinic_owner === true;
    const isPlatformAdmin = user?.role === 'admin';
    const isAdmin = isOwner || isPlatformAdmin;

    if (isAdmin) {
      return {
        role: 'admin',
        roleLabel: 'Administrador',
        canEdit: true,
        canCreate: true,
        canMove: true,
        canExport: true,
        canConfig: true,
        canEditBudget: true,
        isAdmin: true,
        isReadOnly: false,
      };
    }

    // Regular clinic user: can use everything except config
    return {
      role: 'user',
      roleLabel: 'Usuario',
      canEdit: true,
      canCreate: true,
      canMove: true,
      canExport: false,
      canConfig: false,
      canEditBudget: true,
      isAdmin: false,
      isReadOnly: false,
    };
  }, [user?.is_clinic_owner, user?.role]);
}