import React, { useState, useRef } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { PIPELINE_STATES, TREATMENTS, SOURCES, PATIENT_TYPES } from './constants';

const TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'phone', 'email',
  'status', 'patient_type', 'source',
  'treatments', 'assigned_to_name', 'doctor_name',
  'budget_amount', 'budget_currency',
  'financia_tratamiento', 'gastos_financieros',
  'rejection_reason',
  'appointment_date', 'follow_up_date', 'treatment_appointment_date',
  'internal_notes', 'tags'
];

const TEMPLATE_LABELS = {
  first_name: 'Nombre *',
  last_name: 'Apellidos *',
  phone: 'Teléfono *',
  email: 'Email',
  status: `Estado * (${PIPELINE_STATES.map(s => s.id).join(' | ')})`,
  patient_type: `Tipo paciente * (${PATIENT_TYPES.map(p => p.id).join(' | ')})`,
  source: `Fuente (${SOURCES.map(s => s.id).join(' | ')})`,
  treatments: `Tratamientos (${TREATMENTS.map(t => t.id).join(' | ')}) - separados por ;`,
  assigned_to_name: 'Nombre del responsable',
  doctor_name: 'Nombre del doctor/a',
  budget_amount: 'Presupuesto (número)',
  budget_currency: 'Moneda (EUR | USD)',
  financia_tratamiento: 'Financia tratamiento (true | false)',
  gastos_financieros: 'Gastos financieros (número)',
  rejection_reason: 'Motivo rechazo',
  appointment_date: 'Fecha cita (DD/MM/YYYY o YYYY-MM-DD)',
  follow_up_date: 'Fecha seguimiento (DD/MM/YYYY o YYYY-MM-DD)',
  treatment_appointment_date: 'Fecha cita tratamiento (DD/MM/YYYY o YYYY-MM-DD)',
  internal_notes: 'Observaciones internas',
  tags: 'Etiquetas (separadas por ;)'
};

const EXAMPLE_ROW = [
  'Juan', 'García López', '600123456', 'juan@email.com',
  'nuevo_paciente', 'primera_visita', 'web',
  'Implantes;Ortodoncia', 'María Responsable', 'Dr. Pérez',
  '3500', 'EUR',
  'false', '',
  '',
  '', '', '',
  'Paciente interesado en revisión completa', 'vip'
];

function parseDate(val) {
  if (!val) return null;
  // DD/MM/YYYY
  const dmyMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    return new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}T00:00:00.000Z`).toISOString();
  }
  // YYYY-MM-DD or ISO
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function splitCSVLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function parseCSV(text) {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Auto-detect separator: count ; vs , in first line
  const firstLine = lines[0];
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';

  const rawHeaders = splitCSVLine(firstLine, sep);

  // Check if line[1] contains canonical keys (first_name, last_name, etc.)
  const line2 = splitCSVLine(lines[1], sep);
  const line2IsCanonical = line2.filter(v => TEMPLATE_HEADERS.includes(v.trim())).length >= 3;

  let headers, dataStart;
  if (line2IsCanonical) {
    // Template format: row0=labels, row1=canonical keys, row2+=data
    headers = line2.map(v => v.trim());
    dataStart = 2;
  } else {
    // Custom format: row0=labels (map them), row1+=data
    headers = rawHeaders.map(h => {
      const clean = h.toLowerCase().replace(/[^a-záéíóúüñ\s_]/gi, '').trim();
      if (clean.startsWith('nombre') && !clean.includes('responsable') && !clean.includes('doctor')) return 'first_name';
      if (clean.startsWith('apellidos') || clean.startsWith('apellido')) return 'last_name';
      if (clean.startsWith('tel')) return 'phone';
      if (clean.startsWith('email')) return 'email';
      if (clean.startsWith('estado')) return 'status';
      if (clean.startsWith('tipo')) return 'patient_type';
      if (clean.startsWith('fuente')) return 'source';
      if (clean.startsWith('tratamiento')) return 'treatments';
      if (clean.startsWith('nombre') && clean.includes('responsable')) return 'assigned_to_name';
      if (clean.startsWith('nombre') && clean.includes('doctor')) return 'doctor_name';
      if (clean.startsWith('presupuesto')) return 'budget_amount';
      if (clean.startsWith('moneda')) return 'budget_currency';
      if (clean.startsWith('financia')) return 'financia_tratamiento';
      if (clean.startsWith('gastos')) return 'gastos_financieros';
      if (clean.startsWith('motivo')) return 'rejection_reason';
      if (clean.startsWith('fecha cita tra') || clean.startsWith('fecha cita t')) return 'treatment_appointment_date';
      if (clean.startsWith('fecha cita')) return 'appointment_date';
      if (clean.startsWith('fecha seg')) return 'follow_up_date';
      if (clean.startsWith('observ')) return 'internal_notes';
      if (clean.startsWith('etiqueta')) return 'tags';
      return null;
    });
    dataStart = 1;
  }

  return lines.slice(dataStart).map(line => {
    const values = splitCSVLine(line, sep);
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = values[i] || ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v?.trim?.()));
}

function rowToPatient(row, clinicId) {
  const errors = [];

  if (!row.first_name?.trim()) errors.push('Nombre obligatorio');
  if (!row.last_name?.trim()) errors.push('Apellidos obligatorios');
  if (!row.phone?.trim()) errors.push('Teléfono obligatorio');

  const validStatuses = PIPELINE_STATES.map(s => s.id);
  const status = row.status?.trim() || 'nuevo_paciente';
  if (!validStatuses.includes(status)) errors.push(`Estado inválido: ${status}`);

  const validTypes = PATIENT_TYPES.map(p => p.id);
  const patient_type = row.patient_type?.trim() || 'primera_visita';
  if (!validTypes.includes(patient_type)) errors.push(`Tipo de paciente inválido: ${patient_type}`);

  if (errors.length > 0) return { error: errors.join(', ') };

  const treatments = row.treatments
    ? row.treatments.split(';').map(t => t.trim()).filter(Boolean)
    : [];

  const tags = row.tags
    ? row.tags.split(';').map(t => t.trim()).filter(Boolean)
    : [];

  return {
    clinic_id: clinicId,
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    phone: row.phone.trim(),
    email: row.email?.trim() || '',
    status,
    patient_type,
    source: row.source?.trim() || undefined,
    treatments,
    assigned_to_name: row.assigned_to_name?.trim() || '',
    doctor_name: row.doctor_name?.trim() || '',
    budget_amount: row.budget_amount ? parseFloat(row.budget_amount) : undefined,
    budget_currency: row.budget_currency?.trim() || 'EUR',
    financia_tratamiento: row.financia_tratamiento?.toLowerCase() === 'true',
    gastos_financieros: row.gastos_financieros ? parseFloat(row.gastos_financieros) : undefined,
    rejection_reason: row.rejection_reason?.trim() || undefined,
    appointment_date: parseDate(row.appointment_date),
    follow_up_date: parseDate(row.follow_up_date),
    treatment_appointment_date: parseDate(row.treatment_appointment_date),
    internal_notes: row.internal_notes?.trim() || '',
    tags,
    last_action_date: new Date().toISOString(),
  };
}

export default function ImportPatientsModal({ isOpen, onClose, clinicId, onImportComplete }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | results
  const [parsedRows, setParsedRows] = useState([]);
  const [importResults, setImportResults] = useState({ success: 0, errors: [] });
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const resetState = () => {
    setStep('upload');
    setParsedRows([]);
    setImportResults({ success: 0, errors: [] });
    setImporting(false);
    setFileName('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const header = TEMPLATE_HEADERS.map(h => `"${TEMPLATE_LABELS[h] || h}"`).join(',');
    const keyRow = TEMPLATE_HEADERS.map(h => `"${h}"`).join(',');
    const example = EXAMPLE_ROW.map(v => `"${v}"`).join(',');
    const csv = `${header}\n${keyRow}\n${example}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion_pacientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    let rows = [];

    if (isXLSX) {
      // Use base44 ExtractDataFromUploadedFile integration for Excel
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: Object.fromEntries(TEMPLATE_HEADERS.map(h => [h, { type: 'string' }]))
              }
            }
          }
        }
      });
      const rawRows = Array.isArray(result?.output) ? result.output : (result?.output?.rows || []);
      if (rawRows.length > 0) {
        // Check if first row values are canonical keys (template keys row)
        const firstRowValues = Object.values(rawRows[0]).map(v => String(v || '').trim());
        const isKeysRow = firstRowValues.filter(v => TEMPLATE_HEADERS.includes(v)).length >= 3;
        const dataRows = isKeysRow ? rawRows.slice(1) : rawRows;

        // Build a mapping from the object keys (label columns) to canonical field names
        // using the keys row if present, otherwise map by label
        const excelKeys = Object.keys(rawRows[0]);
        const keyMap = {};
        if (isKeysRow) {
          // firstRowValues[i] is the canonical name for excelKeys[i]
          excelKeys.forEach((k, i) => { keyMap[k] = firstRowValues[i]; });
        } else {
          // Map by label matching
          excelKeys.forEach(k => {
            const cl = k.toLowerCase().replace(/[^a-záéíóúüñ\s_]/gi, '').trim();
            if (cl.startsWith('nombre') && !cl.includes('responsable') && !cl.includes('doctor')) keyMap[k] = 'first_name';
            else if (cl.startsWith('apellido')) keyMap[k] = 'last_name';
            else if (cl.startsWith('tel')) keyMap[k] = 'phone';
            else if (cl.startsWith('email')) keyMap[k] = 'email';
            else if (cl.startsWith('estado')) keyMap[k] = 'status';
            else if (cl.startsWith('tipo')) keyMap[k] = 'patient_type';
            else if (cl.startsWith('fuente')) keyMap[k] = 'source';
            else if (cl.startsWith('tratamiento')) keyMap[k] = 'treatments';
            else if (cl.includes('responsable')) keyMap[k] = 'assigned_to_name';
            else if (cl.includes('doctor')) keyMap[k] = 'doctor_name';
            else if (cl.startsWith('presupuesto')) keyMap[k] = 'budget_amount';
            else if (cl.startsWith('moneda')) keyMap[k] = 'budget_currency';
            else if (cl.startsWith('financia')) keyMap[k] = 'financia_tratamiento';
            else if (cl.startsWith('gastos')) keyMap[k] = 'gastos_financieros';
            else if (cl.startsWith('motivo')) keyMap[k] = 'rejection_reason';
            else if (cl.startsWith('fecha') && cl.includes('tra')) keyMap[k] = 'treatment_appointment_date';
            else if (cl.startsWith('fecha') && cl.includes('cita')) keyMap[k] = 'appointment_date';
            else if (cl.startsWith('fecha') && cl.includes('seg')) keyMap[k] = 'follow_up_date';
            else if (cl.startsWith('observ')) keyMap[k] = 'internal_notes';
            else if (cl.startsWith('etiqueta')) keyMap[k] = 'tags';
          });
        }

        rows = dataRows.map(rawRow => {
          const mapped = {};
          for (const [k, v] of Object.entries(rawRow)) {
            const canonical = keyMap[k];
            if (canonical && TEMPLATE_HEADERS.includes(canonical)) {
              mapped[canonical] = v != null ? String(v).trim() : '';
            }
          }
          return mapped;
        }).filter(r => Object.values(r).some(v => v?.trim?.()));
      }
    } else {
      // CSV
      const text = await file.text();
      const allRows = parseCSV(text);
      // If first row is labels (contains *), skip it and use second row as keys
      if (allRows.length > 0) {
        const firstKey = Object.keys(allRows[0])[0];
        // Check if headers are the label row (contains *) - then row[1] is actual keys
        // Our template has: label row, key row, data rows
        // We detect by checking if row values match TEMPLATE_HEADERS
        const keys = Object.keys(allRows[0]);
        const isLabelHeader = keys.some(k => k.includes('*') || k.includes('|'));
        if (isLabelHeader && allRows.length >= 2) {
          // allRows[0] is keys row mapped to label-keys, allRows[1...] are data
          // Re-parse using second row as canonical keys
          const lines = text.split('\n').filter(l => l.trim());
          const canonicalHeaders = parseCSVLine(lines[1]).map(h => h.replace(/^"|"$/g, '').trim());
          rows = lines.slice(2).map(line => {
            const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());
            const obj = {};
            canonicalHeaders.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
          }).filter(r => Object.values(r).some(v => v.trim?.()));
        } else {
          rows = allRows.filter(r => Object.values(r).some(v => v?.trim?.()));
        }
      }
    }

    setParsedRows(rows);
    setStep('preview');
    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const patient = rowToPatient(row, clinicId);
      if (patient.error) {
        errors.push({ row: i + 1, name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || `Fila ${i + 1}`, reason: patient.error });
        continue;
      }
      // Remove undefined fields
      const cleanPatient = Object.fromEntries(Object.entries(patient).filter(([_, v]) => v !== undefined && v !== ''));
      await base44.entities.Patient.create(cleanPatient);
      successCount++;
    }

    setImportResults({ success: successCount, errors });
    setImporting(false);
    setStep('results');
    if (successCount > 0) onImportComplete?.();
  };

  const validRows = parsedRows.filter(r => !rowToPatient(r, clinicId).error);
  const invalidRows = parsedRows.filter(r => !!rowToPatient(r, clinicId).error);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Importar pacientes
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-2">
            {/* Download template */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
              <div>
                <p className="font-medium text-blue-900 text-sm">Paso 1 — Descarga la plantilla</p>
                <p className="text-xs text-blue-700 mt-1">
                  Descarga el CSV, rellena tus pacientes y luego súbelo aquí. La segunda fila contiene los nombres de campo exactos (no la borres).
                </p>
              </div>
              <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100">
                <Download className="w-4 h-4" />
                Descargar plantilla CSV
              </Button>
            </div>

            {/* Upload area */}
            <div className="space-y-2">
              <p className="font-medium text-gray-800 text-sm">Paso 2 — Sube tu archivo</p>
              <label
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 font-medium">Haz clic para seleccionar archivo</span>
                <span className="text-xs text-gray-400 mt-1">CSV o Excel (.xlsx, .xls)</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Field reference */}
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">Ver campos disponibles</summary>
              <div className="mt-2 grid grid-cols-2 gap-1 p-3 bg-gray-50 rounded-lg">
                {TEMPLATE_HEADERS.map(h => (
                  <div key={h} className="flex gap-1">
                    <code className="text-blue-700">{h}</code>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <X className="w-4 h-4 mr-1" /> Cambiar archivo
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{parsedRows.length}</p>
                <p className="text-xs text-gray-500">Filas detectadas</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                <p className="text-xs text-green-600">Válidas</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700">{invalidRows.length}</p>
                <p className="text-xs text-red-600">Con errores</p>
              </div>
            </div>

            {invalidRows.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Filas con errores (no se importarán):</p>
                {invalidRows.map((row, i) => {
                  const err = rowToPatient(row, clinicId);
                  return (
                    <div key={i} className="text-xs text-red-600">
                      <span className="font-medium">{row.first_name} {row.last_name} —</span> {err.error}
                    </div>
                  );
                })}
              </div>
            )}

            {validRows.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-green-700 mb-2">Vista previa de las primeras filas válidas:</p>
                {validRows.slice(0, 5).map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-green-800 py-1 border-b border-green-100 last:border-0">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">{row.first_name} {row.last_name}</span>
                    <span className="text-green-600">{row.phone}</span>
                    <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">{row.status || 'nuevo_paciente'}</Badge>
                  </div>
                ))}
                {validRows.length > 5 && (
                  <p className="text-xs text-green-600 mt-2">...y {validRows.length - 5} más</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                Importar {validRows.length} pacientes
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-lg font-medium text-gray-800">Importando pacientes...</p>
            <p className="text-sm text-gray-500">Por favor, no cierres esta ventana</p>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-700">{importResults.success}</p>
                <p className="text-sm text-green-600">Pacientes importados</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-red-700">{importResults.errors.length}</p>
                <p className="text-sm text-red-600">Errores</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Registros con errores:</p>
                {importResults.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-600 py-1 border-b border-red-100 last:border-0">
                    <span className="font-medium">Fila {e.row} — {e.name}:</span> {e.reason}
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}