import React from 'react';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getActionTypeById, getStateById } from './constants';

// Generate ICS file content
const generateICS = (events) => {
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DentalCRM//Proximas Acciones//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DentalCRM - Próximas Acciones',
    'X-WR-TIMEZONE:Europe/Madrid'
  ];

  events.forEach(event => {
    const actionType = getActionTypeById(event.action_type);
    const state = getStateById(event.status);
    
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:dentalcrm-${event.patient_id}-${Date.now()}@dentalcrm.app`);
    ics.push(`DTSTAMP:${formatDate(new Date())}`);
    ics.push(`DTSTART:${formatDate(event.action_date)}`);
    ics.push(`SUMMARY:${escapeText(actionType?.label || event.action_type)} - ${escapeText(event.patient_name)}`);
    
    let description = `Paciente: ${escapeText(event.patient_name)}\\n`;
    description += `Teléfono: ${escapeText(event.patient_phone)}\\n`;
    description += `Email: ${escapeText(event.patient_email)}\\n`;
    description += `Estado: ${escapeText(state?.label || event.status)}\\n`;
    if (event.action_notes) {
      description += `\\nNotas: ${escapeText(event.action_notes)}`;
    }
    ics.push(`DESCRIPTION:${description}`);
    
    ics.push(`LOCATION:Clínica Dental`);
    ics.push(`STATUS:CONFIRMED`);
    ics.push('BEGIN:VALARM');
    ics.push('TRIGGER:-PT1H');
    ics.push('ACTION:DISPLAY');
    ics.push(`DESCRIPTION:Recordatorio: ${escapeText(actionType?.label || event.action_type)} con ${escapeText(event.patient_name)}`);
    ics.push('END:VALARM');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
};

export default function CalendarExport({ patients, variant = 'default', className = '' }) {
  const handleExportAll = () => {
    const events = patients
      .filter(p => p.next_action_date && p.next_action_type)
      .map(p => ({
        patient_id: p.id,
        patient_name: `${p.first_name} ${p.last_name}`,
        patient_phone: p.phone,
        patient_email: p.email,
        status: p.status,
        action_type: p.next_action_type,
        action_date: p.next_action_date,
        action_notes: p.next_action_notes
      }));

    if (events.length === 0) {
      alert('No hay próximas acciones programadas para exportar');
      return;
    }

    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dentalcrm-acciones-${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportThisWeek = () => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = patients
      .filter(p => {
        if (!p.next_action_date || !p.next_action_type) return false;
        const actionDate = new Date(p.next_action_date);
        return actionDate >= now && actionDate <= weekFromNow;
      })
      .map(p => ({
        patient_id: p.id,
        patient_name: `${p.first_name} ${p.last_name}`,
        patient_phone: p.phone,
        patient_email: p.email,
        status: p.status,
        action_type: p.next_action_type,
        action_date: p.next_action_date,
        action_notes: p.next_action_notes
      }));

    if (events.length === 0) {
      alert('No hay próximas acciones programadas para esta semana');
      return;
    }

    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dentalcrm-acciones-semana-${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = patients
      .filter(p => {
        if (!p.next_action_date || !p.next_action_type) return false;
        const actionDate = new Date(p.next_action_date);
        return actionDate >= today && actionDate < tomorrow;
      })
      .map(p => ({
        patient_id: p.id,
        patient_name: `${p.first_name} ${p.last_name}`,
        patient_phone: p.phone,
        patient_email: p.email,
        status: p.status,
        action_type: p.next_action_type,
        action_date: p.next_action_date,
        action_notes: p.next_action_notes
      }));

    if (events.length === 0) {
      alert('No hay próximas acciones programadas para hoy');
      return;
    }

    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dentalcrm-acciones-hoy-${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionsCount = patients.filter(p => p.next_action_date && p.next_action_type).length;

  if (actionsCount === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className={`gap-2 ${className}`}>
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar a Calendario</span>
          <span className="sm:hidden">Calendario</span>
          <Download className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs text-gray-500">
          {actionsCount} acciones programadas
        </div>
        <DropdownMenuItem onClick={handleExportToday} className="cursor-pointer">
          <Calendar className="w-4 h-4 mr-2" />
          Exportar acciones de hoy
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportThisWeek} className="cursor-pointer">
          <Calendar className="w-4 h-4 mr-2" />
          Exportar esta semana
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAll} className="cursor-pointer">
          <Calendar className="w-4 h-4 mr-2" />
          Exportar todas las acciones
        </DropdownMenuItem>
        <div className="px-2 py-1.5 text-xs text-gray-400 border-t mt-1">
          Archivo .ics compatible con Google Calendar, Outlook, Apple Calendar
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}