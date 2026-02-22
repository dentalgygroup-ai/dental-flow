import React, { useMemo } from 'react';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStateById, daysSince } from './constants';

export default function RequiresAttentionList({ patients, onPatientClick, config = {}, limit = 10 }) {
  const { days_no_movement = 7 } = config;

  // Filter patients that need attention
  const needsAttention = useMemo(() => {
    const result = [];
    
    patients.forEach(patient => {
      const reasons = [];
      
      // No next action scheduled
      if (!patient.next_action_date && patient.status !== 'rechazado' && patient.status !== 'en_tratamiento') {
        reasons.push({
          type: 'no_action',
          severity: 'high',
          message: 'Sin próxima acción programada'
        });
      }
      
      // No movement for X days
      const daysSinceAction = daysSince(patient.last_action_date || patient.created_date);
      if (daysSinceAction !== null && daysSinceAction >= days_no_movement && patient.status !== 'rechazado' && patient.status !== 'en_tratamiento') {
        reasons.push({
          type: 'no_movement',
          severity: 'medium',
          message: `${daysSinceAction} días sin actividad`
        });
      }
      
      // In specific states without required data
      if (patient.status === 'contactado' && !patient.next_action_date) {
        reasons.push({
          type: 'state_requires_action',
          severity: 'high',
          message: 'Contactado sin seguimiento programado'
        });
      }
      
      if (patient.status === 'cita_agendada' && !patient.next_action_date) {
        reasons.push({
          type: 'state_requires_action',
          severity: 'high',
          message: 'Cita agendada sin fecha confirmada'
        });
      }
      
      if (patient.status === 'presupuesto_entregado' && !patient.next_action_date) {
        reasons.push({
          type: 'state_requires_action',
          severity: 'high',
          message: 'Presupuesto entregado sin seguimiento'
        });
      }
      
      if (patient.status === 'en_negociacion' && daysSinceAction !== null && daysSinceAction >= 14) {
        reasons.push({
          type: 'negotiation_stalled',
          severity: 'high',
          message: `Negociación estancada (${daysSinceAction} días)`
        });
      }
      
      if (reasons.length > 0) {
        result.push({
          patient,
          reasons,
          priority: reasons.some(r => r.severity === 'high') ? 'high' : 'medium'
        });
      }
    });
    
    // Sort by priority and days since action
    return result
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        const aDays = daysSince(a.patient.last_action_date || a.patient.created_date) || 0;
        const bDays = daysSince(b.patient.last_action_date || b.patient.created_date) || 0;
        return bDays - aDays;
      })
      .slice(0, limit);
  }, [patients, days_no_movement, limit]);

  if (needsAttention.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-500" />
          Pacientes que requieren atención
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-500">
            ¡Excelente! Todos los pacientes activos tienen seguimiento programado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-amber-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Pacientes que requieren atención
          <Badge className="bg-amber-600 text-white ml-2">{needsAttention.length}</Badge>
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Pacientes sin próxima acción o con tiempo prolongado sin actividad
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {needsAttention.map(({ patient, reasons, priority }) => {
          const state = getStateById(patient.status);
          const daysSinceAction = daysSince(patient.last_action_date || patient.created_date);

          return (
            <button
              key={patient.id}
              onClick={() => onPatientClick(patient)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                priority === 'high' ? 'bg-red-50/30' : 'bg-amber-50/30'
              }`}
            >
              {/* Priority indicator */}
              <div className={`w-1 h-16 rounded-full ${
                priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
              }`} />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 truncate">
                    {patient.first_name} {patient.last_name}
                  </span>
                  <Badge className={`${state?.color} text-xs`}>
                    {state?.label}
                  </Badge>
                </div>
                
                {/* Reasons */}
                <div className="space-y-1">
                  {reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        reason.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <span className={reason.severity === 'high' ? 'text-red-700' : 'text-amber-700'}>
                        {reason.message}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {patient.assigned_to_name || 'Sin asignar'}
                  </span>
                  {daysSinceAction !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Última actividad: hace {daysSinceAction} días
                    </span>
                  )}
                </div>
              </div>

              {/* Action suggestion */}
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  priority === 'high' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <Calendar className="w-3 h-3" />
                  Programar seguimiento
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}