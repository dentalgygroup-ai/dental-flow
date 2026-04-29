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

  const markSeen = async () => {
    // Store in localStorage as primary (reliable) mechanism
    try { localStorage.setItem(`demo_popup_seen_${currentUser?.id || 'user'}`, 'true'); } catch {}
    // Also try to persist on the user record
    try { if (currentUser?.id) await base44.auth.updateMe({ has_seen_demo_popup: true }); } catch {}
  };

  const handleKeepDemo = async () => {
    await markSeen();
    onDismiss();
  };

  const handleDeleteDemo = async () => {
    setDeleting(true);
    const patientIds = demoPatients.map(p => p.id);
    // Borrar todos los datos vinculados en paralelo
    const [allPayments, allTasks, allActions] = await Promise.all([
      base44.entities.Payment.list(),
      base44.entities.Task.list(),
      base44.entities.PatientAction.list(),
    ]);
    const demoPayments = allPayments.filter(pay => patientIds.includes(pay.patient_id));
    const demoTasks = allTasks.filter(t => patientIds.includes(t.patient_id));
    const demoActions = allActions.filter(a => patientIds.includes(a.patient_id));
    await Promise.all([
      ...demoPayments.map(pay => base44.entities.Payment.delete(pay.id)),
      ...demoTasks.map(t => base44.entities.Task.delete(t.id)),
      ...demoActions.map(a => base44.entities.PatientAction.delete(a.id)),
    ]);
    // Borrar pacientes demo
    await Promise.all(patientIds.map(id => base44.entities.Patient.delete(id)));
    await markSeen();
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['patientActions'] });
    setDeleting(false);
    onDismiss();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
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