import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TASK_TYPE_ICONS = {
  llamada: '📞',
  whatsapp: '💬',
  email: '✉️',
  cita: '📅',
  seguimiento: '👁️',
  recordatorio: '🔔',
  otro: '📌'
};

const PRIORITY_DOT = {
  baja: 'bg-gray-400',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500'
};

export default function TaskCalendarView({ tasks, subtasksByParent, onEdit, onComplete }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  // Group tasks by date
  const tasksByDate = {};
  tasks.forEach(task => {
    if (!task.due_date) return;
    const d = new Date(task.due_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(task);
  });

  const getTasksForDay = (date) => {
    if (!date) return [];
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDate[key] || [];
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const [selectedDay, setSelectedDay] = useState(null);
  const selectedTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            const dayTasks = getTasksForDay(date);
            const isSelected = selectedDay && date && date.toDateString() === selectedDay.toDateString();
            const today = isToday(date);
            return (
              <div
                key={i}
                onClick={() => date && setSelectedDay(date)}
                className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors ${
                  date ? 'hover:bg-blue-50/40' : ''
                } ${isSelected ? 'bg-blue-50' : ''}`}
              >
                {date && (
                  <>
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      today ? 'bg-blue-600 text-white' : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${
                            task.status === 'completada' ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority || 'media']}`} />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-blue-500 px-1">+{dayTasks.length - 3} más</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            {selectedDay ? selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecciona un día'}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {!selectedDay && (
            <p className="text-sm text-gray-400 text-center py-8">Haz clic en un día para ver sus tareas</p>
          )}
          {selectedDay && selectedTasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin tareas para este día</p>
          )}
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="p-3 border rounded-lg hover:border-blue-200 cursor-pointer transition-colors"
              onClick={() => onEdit(task)}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); task.status !== 'completada' && onComplete(task); }}
                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                    task.status === 'completada' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'
                  } flex items-center justify-center`}
                >
                  {task.status === 'completada' && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {TASK_TYPE_ICONS[task.task_type]} {task.title}
                  </p>
                  {task.patient_name && (
                    <p className="text-xs text-purple-600 mt-0.5">👤 {task.patient_name}</p>
                  )}
                  {task.assigned_to_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{task.assigned_to_name}</p>
                  )}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                  task.priority === 'urgente' ? 'bg-red-50 text-red-600 border-red-200' :
                  task.priority === 'alta' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}