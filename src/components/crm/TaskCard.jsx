import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Pencil, Trash2, Plus, ChevronDown, ChevronRight, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, isOverdue } from './constants';

const TASK_TYPE_ICONS = {
  llamada: '📞',
  whatsapp: '💬',
  email: '✉️',
  cita: '📅',
  seguimiento: '👁️',
  recordatorio: '🔔',
  otro: '📌'
};

const PRIORITY_STYLES = {
  baja: 'bg-gray-100 text-gray-600 border-gray-200',
  media: 'bg-blue-50 text-blue-700 border-blue-200',
  alta: 'bg-orange-50 text-orange-700 border-orange-200',
  urgente: 'bg-red-50 text-red-700 border-red-200'
};

const PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente'
};

export default function TaskCard({ task, subtasks = [], expanded, onToggleExpand, onEdit, onComplete, onDelete, onAddSubtask }) {
  const isCompleted = task.status === 'completada' || task.status === 'cancelada';
  const overdue = !isCompleted && isOverdue(task.due_date);
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = subtasks.filter(s => s.status === 'completada').length;

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${overdue ? 'border-red-200' : 'border-gray-100'} ${isCompleted ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Complete button */}
          <button
            onClick={() => !isCompleted && onComplete(task)}
            disabled={isCompleted}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
            }`}
          >
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2">
              <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                <span>{TASK_TYPE_ICONS[task.task_type] || '📌'}</span>
                <span className={isCompleted ? 'line-through text-gray-400' : ''}>{task.title}</span>
              </span>
              <Badge className={`text-xs border ${PRIORITY_STYLES[task.priority || 'media']}`}>
                {PRIORITY_LABELS[task.priority || 'media']}
              </Badge>
              {overdue && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Vencida
                </Badge>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
              {task.due_date && (
                <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(task.due_date)}
                </span>
              )}
              {task.patient_name && (
                <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                  👤 {task.patient_name}
                </span>
              )}
              {task.assigned_to_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {task.assigned_to_name}
                </span>
              )}
              {hasSubtasks && (
                <span className="flex items-center gap-1 text-blue-500">
                  {completedSubtasks}/{subtasks.length} subtareas
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasSubtasks && (
              <Button variant="ghost" size="icon" onClick={onToggleExpand} className="w-7 h-7">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            {!isCompleted && (
              <Button variant="ghost" size="icon" onClick={onAddSubtask} className="w-7 h-7" title="Añadir subtarea">
                <Plus className="w-3.5 h-3.5 text-gray-400" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onEdit} className="w-7 h-7">
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(task)} className="w-7 h-7">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="border-t border-gray-50 bg-gray-50/50 rounded-b-xl px-4 pb-3 pt-2 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Subtareas</p>
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
              <button
                onClick={() => sub.status !== 'completada' && onComplete(sub)}
                disabled={sub.status === 'completada'}
                className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  sub.status === 'completada'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {sub.status === 'completada' && <CheckCircle2 className="w-3 h-3 text-white" />}
              </button>
              <span className={`text-xs flex-1 ${sub.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {TASK_TYPE_ICONS[sub.task_type] || '📌'} {sub.title}
              </span>
              {sub.due_date && (
                <span className="text-xs text-gray-400">{formatDate(sub.due_date)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}