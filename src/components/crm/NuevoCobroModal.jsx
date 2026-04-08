import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from './constants';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'financiacion', label: 'Financiación' },
  { id: 'otro', label: 'Otro' },
];

export default function NuevoCobroModal({ isOpen, onClose, preselectedPatient = null }) {
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const clinicId = currentUser?.clinic_id;

  const { data: patients = [] } = useQuery({
    queryKey: ['patientsForCobro', clinicId],
    queryFn: () => clinicId
      ? base44.entities.Patient.filter({ clinic_id: clinicId }, 'first_name')
      : [],
    enabled: !!clinicId && isOpen,
  });

  const eligiblePatients = useMemo(() =>
    patients.filter(p =>
      ['aceptado_pendiente_pago', 'en_tratamiento'].includes(p.status) &&
      (p.saldo_pendiente ?? (p.importe_aceptado ?? 0)) > 0
    ),
    [patients]
  );

  const filteredPatients = useMemo(() => {
    if (!search) return eligiblePatients;
    const s = search.toLowerCase();
    return eligiblePatients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s)
    );
  }, [eligiblePatients, search]);

  const selectedPatient = useMemo(() =>
    patients.find(p => p.id === patientId),
    [patients, patientId]
  );

  const saldoPendiente = selectedPatient
    ? (selectedPatient.saldo_pendiente ?? selectedPatient.importe_aceptado ?? 0)
    : 0;

  const amountNum = parseFloat(amount) || 0;
  const saldoTrasCobroNum = Math.max(0, saldoPendiente - amountNum);

  // Preselect patient when modal opens with a preselectedPatient
  React.useEffect(() => {
    if (isOpen && preselectedPatient) {
      setPatientId(preselectedPatient.id);
      setSearch(`${preselectedPatient.last_name}, ${preselectedPatient.first_name}`);
    } else if (!isOpen) {
      handleReset();
    }
  }, [isOpen, preselectedPatient?.id]);

  const handleReset = () => {
    setPatientId('');
    setAmount('');
    setPaymentMethod('efectivo');
    setNotes('');
    setSearch('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedPatient || amountNum <= 0) return;
    setSaving(true);

    const totalCobrado = (selectedPatient.total_cobrado || 0) + amountNum;
    const importeAceptado = selectedPatient.importe_aceptado ?? 0;
    const saldoPendienteNew = Math.max(0, importeAceptado - totalCobrado);
    const newStatus = saldoPendienteNew === 0 ? 'pagado' : selectedPatient.status;

    await base44.entities.Payment.create({
      patient_id: selectedPatient.id,
      patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
      clinic_id: clinicId,
      amount: amountNum,
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod,
      notes: notes || undefined,
      performed_by: currentUser?.email,
      performed_by_name: currentUser?.full_name,
    });

    const updateData = {
      total_cobrado: totalCobrado,
      saldo_pendiente: saldoPendienteNew,
    };
    if (newStatus !== selectedPatient.status) {
      updateData.status = newStatus;
    }
    await base44.entities.Patient.update(selectedPatient.id, updateData);

    toast({
      title: `Cobro de ${formatCurrency(amountNum)} registrado correctamente.`,
      description: `Saldo pendiente: ${formatCurrency(saldoPendienteNew)}`,
      duration: 4000,
    });

    setSaving(false);
    handleClose();
  };

  const isValid = selectedPatient && amountNum > 0 && amountNum <= saldoPendiente;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Nuevo Cobro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Paciente */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Paciente</Label>
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPatientId(''); }}
              className="mb-1"
            />
            {search && !patientId && (
              <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-sm">
                {filteredPatients.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">Sin resultados</p>
                ) : (
                  filteredPatients.map(p => {
                    const saldo = p.saldo_pendiente ?? p.importe_aceptado ?? 0;
                    return (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                        onClick={() => {
                          setPatientId(p.id);
                          setSearch(`${p.last_name}, ${p.first_name}`);
                          setAmount('');
                        }}
                      >
                        <span className="font-medium">{p.last_name}, {p.first_name}</span>
                        <span className="text-gray-500 ml-1">(pendiente: {formatCurrency(saldo)})</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {selectedPatient && (
              <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                Saldo pendiente actual: <strong>{formatCurrency(saldoPendiente)}</strong>
              </p>
            )}
          </div>

          {/* Importe */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Importe cobrado (€)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              <Input
                type="number"
                min="0.01"
                max={saldoPendiente}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                disabled={!selectedPatient}
              />
            </div>
            {selectedPatient && amountNum > 0 && (
              <p className="text-xs text-gray-500">
                Saldo que quedará pendiente: <strong className={saldoTrasCobroNum === 0 ? 'text-green-600' : 'text-orange-600'}>{formatCurrency(saldoTrasCobroNum)}</strong>
              </p>
            )}
            {amountNum > saldoPendiente && saldoPendiente > 0 && (
              <p className="text-xs text-red-500">El importe supera el saldo pendiente ({formatCurrency(saldoPendiente)})</p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones del cobro..."
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={!isValid || saving}>
              {saving ? 'Guardando...' : 'Confirmar cobro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}