import React from 'react';
import { User, TrendingUp } from 'lucide-react';
import { ACTIVE_STATES, formatCurrency } from './constants';

const CLINICAL_STATES = ['aceptado_pendiente_pago', 'pagado_parcialmente', 'pagado', 'pendiente_cita_tratamiento', 'citado_tratamiento', 'en_tratamiento'];

export default function ResponsibleStats({ patients, users }) {
  const stats = users.map(resp => {
    const userPatients = patients.filter(p => p.assigned_to === resp.id);
    const activePatients = userPatients.filter(p => ACTIVE_STATES.includes(p.status));
    const inNegotiation = userPatients.filter(p => p.status === 'presupuesto_entregado');
    const closed = userPatients.filter(p => CLINICAL_STATES.includes(p.status));
    const rejected = userPatients.filter(p => p.status === 'rechazado');
    
    const negotiationAmount = inNegotiation.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    
    const totalForRatio = closed.length + rejected.length;
    const closeRatio = totalForRatio > 0 ? ((closed.length / totalForRatio) * 100).toFixed(0) : '—';

    return {
      resp,
      activeCount: activePatients.length,
      negotiationCount: inNegotiation.length,
      negotiationAmount,
      paidCount: closed.length,
      closeRatio
    };
  }).filter(s => s.activeCount > 0 || s.paidCount > 0);

  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          Productividad por responsable
        </h3>
        <p className="text-sm text-gray-500 text-center py-8">
          Sin datos de productividad
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          Productividad por responsable
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Responsable</th>
              <th className="text-center py-3 px-4 font-medium">Activos</th>
              <th className="text-center py-3 px-4 font-medium">Negociación</th>
              <th className="text-right py-3 px-4 font-medium">Importe neg.</th>
              <th className="text-center py-3 px-4 font-medium">Cerrados</th>
              <th className="text-center py-3 px-4 font-medium">Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map(({ resp, activeCount, negotiationCount, negotiationAmount, paidCount, closeRatio }) => (
              <tr key={resp.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {resp.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{resp.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                    {activeCount}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full font-semibold text-sm">
                    {negotiationCount}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {formatCurrency(negotiationAmount)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                    {paidCount}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {closeRatio !== '—' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                    <span className={`font-semibold ${closeRatio !== '—' ? 'text-green-600' : 'text-gray-400'}`}>
                      {closeRatio}{closeRatio !== '—' ? '%' : ''}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}