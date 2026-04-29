import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function DemoWelcomePopup({ isOpen, currentUser, demoPatients = [], onDismiss }) {
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleKeepDemo = async () => {
    if (currentUser?.id) {
      await base44.auth.updateMe({ has_seen_demo_popup: true });
    }
    onDismiss();
  };

  const handleDeleteDemo = async () => {
    setDeleting(true);
    await Promise.all(demoPatients.map(p => base44.entities.Patient.delete(p.id)));
    if (currentUser?.id) {
      await base44.auth.updateMe({ has_seen_demo_popup: true });
    }
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    setDeleting(false);
    onDismiss();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md w-[calc(100vw-2rem)] mx-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-violet-600 flex-shrink-0" />
            <AlertDialogTitle className="text-lg leading-tight">¡Bienvenido/a a Dental Flow!</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed">
            Hemos precargado <strong>{demoPatients.length} pacientes de ejemplo</strong> para que puedas explorar el pipeline, el dashboard y todas las funcionalidades sin necesidad de introducir datos reales.
            <br /><br />
            ¿Qué quieres hacer con los datos de prueba?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleDeleteDemo}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Borrar datos de prueba
          </Button>
          <Button
            className="w-full gap-2"
            onClick={handleKeepDemo}
            disabled={deleting}
          >
            <FlaskConical className="w-4 h-4" />
            Explorar con datos de ejemplo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}