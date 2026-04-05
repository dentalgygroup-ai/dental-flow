import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function PatientPortal() {
  const { token } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadPatient() {
      try {
        const decoded = JSON.parse(atob(token));
        const { patient_id, expires } = decoded;

        if (new Date(expires) < new Date()) {
          setMessage({ text: 'Este enlace ha expirado. Contacta con la clínica.', type: 'error' });
          setLoading(false);
          return;
        }

        const patients = await base44.entities.Patient.filter({ id: patient_id });
        if (patients[0]) {
          setPatient(patients[0]);
        } else {
          setMessage({ text: 'No se encontró la información. Contacta con la clínica.', type: 'error' });
        }
      } catch (e) {
        setMessage({ text: 'Enlace inválido. Contacta con la clínica.', type: 'error' });
      }
      setLoading(false);
    }
    if (token) loadPatient();
  }, [token]);

  const handleConfirmAppointment = async () => {
    setActionLoading(true);
    try {
      await base44.entities.Patient.update(patient.id, {
        status: 'citado',
        treatment_appointment_date: patient.appointment_date
      });
      setMessage({ text: '¡Cita confirmada! La clínica te contactará pronto.', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Error al confirmar. Contacta directamente con la clínica.', type: 'error' });
    }
    setActionLoading(false);
  };

  const handleAcceptBudget = async () => {
    setActionLoading(true);
    try {
      await base44.entities.Patient.update(patient.id, {
        status: 'aceptado_pendiente_pago'
      });
      setMessage({ text: '¡Presupuesto aceptado! Te contactaremos para formalizar el pago.', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Error al aceptar. Contacta directamente con la clínica.', type: 'error' });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (message && !patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-6">
        <div className={`max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          <p className="text-lg font-medium">{message.text}</p>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🦷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {patient.first_name}</h1>
          <p className="text-gray-500 mt-1">Te compartimos el resumen de tu visita</p>
        </div>

        {/* Treatments */}
        {patient.treatments?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-700 mb-3">Tratamientos</h2>
            <div className="flex flex-wrap gap-2">
              {patient.treatments.map(t => (
                <span key={t} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Budget */}
        {patient.budget_amount > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-700 mb-1">Presupuesto</h2>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: patient.budget_currency || 'EUR', minimumFractionDigits: 0 }).format(patient.budget_amount)}
            </p>
          </div>
        )}

        {/* Appointment */}
        {patient.appointment_date && (
          <div className="bg-green-50 border border-green-100 rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold text-green-700 mb-2">Tu próxima cita</h2>
            <p className="text-lg font-medium text-gray-900">
              {new Date(patient.appointment_date).toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {/* Message after action */}
        {message && (
          <div className={`rounded-2xl p-4 text-center font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {patient.appointment_date && (
            <button
              onClick={handleConfirmAppointment}
              disabled={actionLoading || !!message}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-semibold text-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg"
            >
              {actionLoading ? 'Confirmando...' : '✓ Confirmar Cita'}
            </button>
          )}
          {patient.budget_amount > 0 && (
            <button
              onClick={handleAcceptBudget}
              disabled={actionLoading || !!message}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
            >
              {actionLoading ? 'Aceptando...' : '✓ Aceptar Presupuesto'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Este enlace caduca en 7 días · Dental Flow
        </p>
      </div>
    </div>
  );
}