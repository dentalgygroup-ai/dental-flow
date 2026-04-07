// Pipeline states in exact order
export const PIPELINE_STATES = [
  { id: 'nuevo_paciente', label: 'Nuevo paciente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'contactado', label: 'Contactado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'cita_agendada', label: 'Cita agendada', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'cita_realizada', label: 'Cita realizada', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'presupuesto_entregado', label: 'Presupuesto entregado', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'en_negociacion', label: 'En negociación', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'rechazado', label: 'RECHAZADO', color: 'bg-gray-200 text-gray-600 border-gray-300', isRejected: true },
  { id: 'aceptado_pendiente_pago', label: 'Aceptado pendiente de pago', color: 'bg-lime-100 text-lime-800 border-lime-200' },
  { id: 'pagado_parcialmente', label: 'Pagado parcialmente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'pagado', label: 'Pagado', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'pendiente_cita_tratamiento', label: 'Pendiente de cita tratamiento', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'citado_tratamiento', label: 'Citado tratamiento', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'en_tratamiento', label: 'En tratamiento', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', isClosed: true }
];

export const TREATMENTS = [
  { id: 'Implantes', label: 'Implantes', color: 'bg-rose-100 text-rose-700' },
  { id: 'Ortodoncia', label: 'Ortodoncia', color: 'bg-sky-100 text-sky-700' },
  { id: 'Estética', label: 'Estética', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { id: 'General', label: 'General', color: 'bg-slate-100 text-slate-700' }
];

export const SOURCES = [
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'web', label: 'Web' },
  { id: 'referido', label: 'Referido' },
  { id: 'campana', label: 'Campaña' },
  { id: 'redes_sociales', label: 'Redes sociales' },
  { id: 'otro', label: 'Otro' }
];

export const PATIENT_TYPES = [
  { id: 'primera_visita', label: 'Primera visita', color: 'bg-blue-100 text-blue-700' },
  { id: 'old_contact', label: 'Old contact', color: 'bg-gray-100 text-gray-700' },
  { id: 'referencia', label: 'Referencia', color: 'bg-purple-100 text-purple-700' },
  { id: 'ampliacion', label: 'Ampliación', color: 'bg-green-100 text-green-700' }
];

export const REJECTION_REASONS = [
  { id: 'precio', label: 'Precio' },
  { id: 'tiempo', label: 'Tiempo' },
  { id: 'competencia', label: 'Competencia' },
  { id: 'no_interesado', label: 'No interesado' },
  { id: 'sin_financiacion', label: 'Sin financiación' },
  { id: 'otro', label: 'Otro' }
];

export const ACTION_TYPES = [
  { id: 'llamada', label: 'Llamada', icon: 'Phone' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { id: 'email', label: 'Email', icon: 'Mail' },
  { id: 'cita', label: 'Cita', icon: 'Calendar' },
  { id: 'seguimiento', label: 'Seguimiento', icon: 'UserCheck' },
  { id: 'otro', label: 'Otro', icon: 'MoreHorizontal' }
];

export const ROLES = {
  admin: { label: 'Administrador', canEdit: true, canCreate: true, canMove: true, canExport: true, canConfig: true, canEditBudget: true },
  comercial: { label: 'Comercial', canEdit: true, canCreate: true, canMove: true, canExport: false, canConfig: false, canEditBudget: true },
  recepcion: { label: 'Recepción', canEdit: true, canCreate: true, canMove: true, canExport: false, canConfig: false, canEditBudget: false },
  solo_lectura: { label: 'Solo lectura', canEdit: false, canCreate: false, canMove: false, canExport: false, canConfig: false, canEditBudget: false }
};

export const getStateById = (id) => PIPELINE_STATES.find(s => s.id === id);
export const getTreatmentById = (id) => TREATMENTS.find(t => t.id === id);
export const getSourceById = (id) => SOURCES.find(s => s.id === id);
export const getPatientTypeById = (id) => PATIENT_TYPES.find(p => p.id === id);
export const getRejectionReasonById = (id) => REJECTION_REASONS.find(r => r.id === id);
export const getActionTypeById = (id) => ACTION_TYPES.find(a => a.id === id);

// Active states for metrics (excludes rejected and in treatment)
export const ACTIVE_STATES = PIPELINE_STATES.filter(s => !s.isRejected && !s.isClosed).map(s => s.id);

// Business rules for state transitions
// Each entry lists the fields that must be collected when moving TO that state FROM specific source states
export const STATE_REQUIREMENTS = {
  // contactado -> cita_agendada: fecha de la cita
  cita_agendada: {
    fromStates: ['contactado'],
    fields: [{ key: 'appointment_date', label: 'Fecha de la cita', type: 'datetime', required: true }],
    message: 'Indica la fecha de la cita agendada'
  },
  // cita_agendada -> cita_realizada: fecha de seguimiento
  cita_realizada: {
    fromStates: ['cita_agendada'],
    fields: [{ key: 'follow_up_date', label: 'Fecha de seguimiento', type: 'datetime', required: true }],
    message: 'Indica la fecha de seguimiento'
  },
  // cita_realizada -> presupuesto_entregado: importe + tratamientos
  presupuesto_entregado: {
    fromStates: ['cita_realizada'],
    fields: [
      { key: 'budget_amount', label: 'Importe del presupuesto (€)', type: 'number', required: true },
      { key: 'treatments', label: 'Tratamientos presupuestados', type: 'treatments', required: true }
    ],
    message: 'Introduce el importe y los tratamientos presupuestados'
  },
  // presupuesto_entregado -> en_negociacion: fecha de seguimiento
  en_negociacion: {
    fromStates: ['presupuesto_entregado'],
    fields: [{ key: 'follow_up_date', label: 'Fecha de seguimiento', type: 'datetime', required: true }],
    message: 'Indica la fecha de seguimiento'
  },
  // presupuesto_entregado / en_negociacion -> rechazado: motivo
  rechazado: {
    fromStates: ['presupuesto_entregado', 'en_negociacion'],
    fields: [{ key: 'rejection_reason', label: 'Motivo del rechazo', type: 'rejection_reason', required: true }],
    message: 'Indica el motivo del rechazo'
  },
  // presupuesto_entregado / en_negociacion -> aceptado_pendiente_pago: fecha seguimiento
  aceptado_pendiente_pago: {
    fromStates: ['presupuesto_entregado', 'en_negociacion'],
    fields: [{ key: 'follow_up_date', label: 'Fecha de seguimiento', type: 'datetime', required: true }],
    message: 'Indica la fecha de seguimiento'
  },
  // presupuesto_entregado / en_negociacion / aceptado_pendiente_pago -> pagado: fecha cita tratamiento
  pagado: {
    fromStates: ['presupuesto_entregado', 'en_negociacion', 'aceptado_pendiente_pago'],
    fields: [{ key: 'treatment_appointment_date', label: 'Fecha de cita de tratamiento', type: 'datetime', required: true }],
    message: 'Indica la fecha de la cita de tratamiento'
  }
  // Nota: pendiente_cita_tratamiento y citado_tratamiento son estados post-venta sin requisitos de transición definidos
};

export const formatCurrency = (amount, currency = 'EUR') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const isOverdue = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

export const daysSince = (date) => {
  if (!date) return null;
  const now = new Date();
  const d = new Date(date);
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
};