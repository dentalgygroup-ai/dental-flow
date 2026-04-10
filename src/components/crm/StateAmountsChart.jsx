import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PIPELINE_STATES, formatCurrency } from './constants';

const COLORS = {
  nuevo_paciente: '#3B82F6',
  contactado: '#6366F1',
  cita_agendada: '#8B5CF6',
  cita_realizada: '#7C3AED',
  presupuesto_entregado: '#F59E0B',
  en_negociacion: '#F97316',
  rechazado: '#9CA3AF',
  aceptado_pendiente_pago: '#84CC16',
  pagado: '#22C55E',
  pendiente_cita: '#14B8A6',
  citado: '#06B6D4',
  en_tratamiento: '#10B981'
};

export default function StateAmountsChart({ patients }) {
  const data = PIPELINE_STATES.map(state => {
    const statePatients = patients.filter(p => p.status === state.id);
    const totalAmount = statePatients.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    
    return {
      id: state.id,
      name: state.label,
      fullName: state.label,
      count: statePatients.length,
      amount: totalAmount,
      isRejected: state.isRejected
    };
  }).filter(d => (d.count > 0 || d.amount > 0) && !['contactado', 'cita_agendada', 'cita_realizada', 'nuevo_paciente'].includes(d.id));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">{data.count} pacientes</p>
          <p className="text-sm font-medium text-emerald-600">{formatCurrency(data.amount)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Montante por estado</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis 
              type="number" 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={160}
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.id] || '#9CA3AF'} 
                  opacity={entry.isRejected ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}