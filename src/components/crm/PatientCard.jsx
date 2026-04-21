import React, { useState } from 'react';
import { Phone, Mail, Calendar, Clock, AlertTriangle, AlertCircle, User, CheckCircle } from 'lucide-react';
import AcceptBudgetModal from './AcceptBudgetModal';
import NuevoCobroModal from './NuevoCobroModal';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { 
  getTreatmentById, 
  formatCurrency, 
  formatDate, 
  getActionTypeById,
  isOverdue,
  isToday,
  daysSince
} from './constants';

export default function PatientCard({ patient, onClick, config = {} }) {
  const { days_no_movement = 7, days_in_negotiation = 14 } = config;
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const queryClient = useQueryClient();
  
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const actionOverdue = isOverdue(patient.next_action_date);
  const actionToday = isToday(patient.next_action_date);
  const daysSinceAction = daysSince(patient.last_action_date || patient.created_date);
  const noMovement = daysSinceAction !== null && daysSinceAction >= days_no_movement;
  const inNegotiationTooLong = patient.status === 'en_negociacion' && daysSinceAction !== null && daysSinceAction >= days_in_negotiation;
  
  const actionType = getActionTypeById(patient.next_action_type);

  const handleAcceptBudget = async ({ importe_aceptado }) => {
    const totalCobrado = patient.total_cobrado || 0;
    let newStatus;
    if (totalCobrado <= 0) {
      newStatus = 'aceptado_pendiente_pago';
    } else if (totalCobrado < importe_aceptado) {
      newStatus = 'pagado_parcialmente';
    } else {
      newStatus = 'pagado';
    }
    const saldoPendiente = Math.max(0, importe_aceptado - totalCobrado);
    await base44.entities.Patient.update(patient.id, {
      importe_aceptado,
      sold_amount: importe_aceptado,
      status: newStatus,
      saldo_pendiente: saldoPendiente,
      last_action_date: new Date().toISOString()
    });
    await base44.entities.PatientAction.create({
      patient_id: patient.id,
      action_type: 'cambio_estado',
      description: `Presupuesto aceptado · ${importe_aceptado}€ pendientes`,
      performed_by: 'sistema',
      performed_by_name: 'Sistema',
      old_value: patient.status,
      new_value: newStatus
    });
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    setShowAcceptModal(false);
  };

  return (
    <div
      onClick={(showAcceptModal || showCobroModal) ? undefined : onClick}
      className={`
        bg-white rounded-xl p-4 shadow-sm border cursor-pointer 
        transition-all duration-200 hover:shadow-md hover:border-gray-300
        ${actionOverdue ? 'border-l-4 border-l-red-500' : ''}
        ${actionToday && !actionOverdue ? 'border-l-4 border-l-blue-500' : ''}
        ${noMovement && !actionOverdue && !actionToday ? 'border-l-4 border-l-amber-400' : ''}
        ${inNegotiationTooLong ? 'border-l-4 border-l-orange-500' : ''}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !showAcceptModal && !showCobroModal && onClick?.()}
    >
      {/* Demo badge */}
      {patient.is_demo && (
        <div className="flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full w-fit mb-2">
          <span>🧪</span> Ejemplo
        </div>
      )}

      {/* Header with name and alerts */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{fullName}</h3>
        <div className="flex gap-1 flex-shrink-0">
          {actionOverdue && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Vencida
            </span>
          )}
          {actionToday && !actionOverdue && (
            <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              Hoy
            </span>
          )}
          {(noMovement || inNegotiationTooLong) && !actionOverdue && !actionToday && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {daysSinceAction}d
            </span>
          )}
        </div>
      </div>

      {/* Treatments chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {patient.treatments?.map(t => {
          const treatment = getTreatmentById(t);
          return treatment ? (
            <Badge key={t} variant="secondary" className={`${treatment.color} text-xs font-medium px-2 py-0.5`}>
              {treatment.label}
            </Badge>
          ) : null;
        })}
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 mb-3">
        <a 
          href={`tel:${patient.phone}`} 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{patient.phone}</span>
        </a>
        <a 
          href={`mailto:${patient.email}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors truncate"
        >
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{patient.email}</span>
        </a>
      </div>

      {/* Budget */}
      {patient.status !== 'cita_realizada' && patient.budget_amount !== null && patient.budget_amount !== undefined && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {patient.importe_aceptado != null && patient.importe_aceptado !== patient.budget_amount ? (
              <>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(patient.importe_aceptado, 'EUR')}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {formatCurrency(patient.budget_amount, 'EUR')}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-emerald-700">
                {formatCurrency(patient.budget_amount, 'EUR')}
              </span>
            )}
          </div>
          {patient.status === 'presupuesto_entregado' && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAcceptModal(true); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Aceptar
            </button>
          )}
        </div>
      )}

      {/* Importe aceptado para estados post-aceptación (sin budget_amount) */}
      {patient.status !== 'cita_realizada' && patient.importe_aceptado != null && (patient.budget_amount === null || patient.budget_amount === undefined) && (
        <div className="mb-3">
          <span className="text-sm font-semibold text-blue-600">
            {formatCurrency(patient.importe_aceptado, 'EUR')}
          </span>
        </div>
      )}

      {patient.status !== 'cita_realizada' && patient.status === 'presupuesto_entregado' && (patient.budget_amount === null || patient.budget_amount === undefined) && (
        <div className="mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowAcceptModal(true); }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Aceptar presupuesto
          </button>
        </div>
      )}

      {/* Payment status badge + Cobro button */}
      {patient.status === 'aceptado_pendiente_pago' && (patient.saldo_pendiente ?? 0) > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg flex-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium text-orange-700">{formatCurrency(patient.saldo_pendiente)} pendientes</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowCobroModal(true); }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            💰 Cobro
          </button>
        </div>
      )}
      {patient.status === 'pagado_parcialmente' && (patient.saldo_pendiente ?? 0) > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg flex-1">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs font-medium text-red-700">{formatCurrency(patient.saldo_pendiente)} pendientes</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowCobroModal(true); }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            💰 Cobro
          </button>
        </div>
      )}
      {patient.status === 'pagado' && (
        <div className="mb-3 flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs font-medium text-green-700">✓ Liquidado</span>
        </div>
      )}

      {/* Footer with responsible and dates */}
      <div className="pt-3 border-t border-gray-100 space-y-1.5">
        {patient.assigned_to_name && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{patient.assigned_to_name}</span>
          </div>
        )}
        
        {patient.last_action_date && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Última: {formatDate(patient.last_action_date)}</span>
          </div>
        )}
        
        {patient.next_action_type && patient.next_action_date && (
          <div className={`flex items-center gap-2 text-xs ${actionOverdue ? 'text-red-600 font-medium' : actionToday ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{actionType?.label}: {formatDate(patient.next_action_date)}</span>
          </div>
        )}
      </div>
      <AcceptBudgetModal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        patient={patient}
        onConfirm={handleAcceptBudget}
      />
      <NuevoCobroModal
        isOpen={showCobroModal}
        onClose={() => setShowCobroModal(false)}
        preselectedPatient={patient}
      />
    </div>
  );
}