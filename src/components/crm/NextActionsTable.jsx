import React from 'react';
import { Calendar, Clock, AlertCircle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  getStateById, 
  getActionTypeById, 
  formatDate,
  isOverdue,
  isToday 
} from './constants';

export default function NextActionsTable({ patients, onPatientClick, limit = 10 }) {
  // Filter patients with next actions and sort by date
  const actionsPatients = patients
    .filter(p => p.next_action_type && p.next_action_date)
    .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))
    .slice(0, limit);

  if (actionsPatients.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Próximas acciones
        </h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No hay acciones programadas
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Próximas acciones
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {actionsPatients.map(patient => {
          const state = getStateById(patient.status);
          const actionType = getActionTypeById(patient.next_action_type);
          const overdue = isOverdue(patient.next_action_date);
          const today = isToday(patient.next_action_date);

          return (
            <button
              key={patient.id}
              onClick={() => onPatientClick(patient)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                overdue ? 'bg-red-50/50' : today ? 'bg-blue-50/50' : ''
              }`}
            >
              {/* Status indicator */}
              <div className={`w-1 h-12 rounded-full ${
                overdue ? 'bg-red-500' : today ? 'bg-blue-500' : 'bg-gray-200'
              }`} />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {patient.first_name} {patient.last_name}
                  </span>
                  {overdue && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Vencida
                    </Badge>
                  )}
                  {today && !overdue && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Hoy
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <Badge variant="secondary" className={`${state?.color} text-xs`}>
                    {state?.label}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {patient.assigned_to_name || 'Sin asignar'}
                  </span>
                </div>
              </div>

              {/* Action info */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {actionType?.label}
                </p>
                <p className={`text-xs ${overdue ? 'text-red-600' : today ? 'text-blue-600' : 'text-gray-500'}`}>
                  {formatDate(patient.next_action_date)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}