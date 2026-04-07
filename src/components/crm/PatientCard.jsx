import React, { useState } from 'react';
import { Phone, Mail, Calendar, Clock, AlertTriangle, AlertCircle, User, CheckCircle } from 'lucide-react';
import AcceptBudgetModal from './AcceptBudgetModal';
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
  const queryClient = useQueryClient();
  
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const actionOverdue = isOverdue(patient.next_action_date);
  const actionToday = isToday(patient.next_action_date);
  const daysSinceAction = daysSince(patient.last_action_date || patient.created_date);
  const noMovement = daysSinceAction !== null && daysSinceAction >= days_no_movement;
  const inNegotiationTooLong = patient.status === 'en_negociacion' && daysSinceAction !== null && daysSinceAction >= days_in_negotiation;
  
  const actionType = getActionTypeById(patient.next_action_type);

  const handleAcceptBudget = async ({ importe_aceptado, markAsPaid }) => {
    const newStatus = markAsPaid ? 'pagado' : 'aceptado_pendiente_pago';
    await base44.entities.Patient.update(patient.id, {
      importe_aceptado,
      sold_amount: importe_aceptado,
      status: newStatus,
      last_action_date: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    setShowAcceptModal(false);
  };

  return (
    <div
      onClick={onClick}
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
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
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
      {patient.budget_amount !== null && patient.budget_amount !== undefined && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-emerald-700">
            {formatCurrency(patient.budget_amount, 'EUR')}
          </span>
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

      {patient.status === 'presupuesto_entregado' && (patient.budget_amount === null || patient.budget_amount === undefined) && (
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
    </div>
  );
}