import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PIPELINE_STATES, TREATMENTS, SOURCES, PATIENT_TYPES } from './constants';

export default function FilterBar({ 
  filters, 
  onFilterChange, 
  users = [],
  doctors = [],
  showStateFilter = true,
  compact = false 
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFiltersCount = [
    filters.search,
    filters.status,
    filters.assigned_to,
    filters.doctor_id,
    filters.treatments?.length > 0,
    filters.source,
    filters.patient_type,
    filters.budget_min,
    filters.budget_max
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: '',
      assigned_to: '',
      doctor_id: '',
      treatments: [],
      source: '',
      patient_type: '',
      budget_min: '',
      budget_max: ''
    });
  };

  const handleTreatmentToggle = (treatmentId) => {
    const current = filters.treatments || [];
    const updated = current.includes(treatmentId)
      ? current.filter(t => t !== treatmentId)
      : [...current, treatmentId];
    onFilterChange({ ...filters, treatments: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-10 h-10"
          />
        </div>

        {/* Quick filters */}
        {showStateFilter && (
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFilterChange({ ...filters, status: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado</SelectItem>
              {PIPELINE_STATES.map(state => (
                <SelectItem key={state.id} value={state.id}>{state.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.assigned_to || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, assigned_to: value === 'all' ? '' : value })}
        >
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Responsable</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id || user.email} value={user.id || user.email}>{user.name || user.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {doctors.length > 0 && (
          <Select
            value={filters.doctor_id || 'all'}
            onValueChange={(value) => onFilterChange({ ...filters, doctor_id: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Doctor</SelectItem>
              {doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Advanced filters toggle */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="bg-blue-600 text-white ml-1">{activeFiltersCount}</Badge>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="font-medium text-sm">Filtros avanzados</div>
              
              {/* Treatments */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Tratamientos</Label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENTS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTreatmentToggle(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        (filters.treatments || []).includes(t.id)
                          ? t.color + ' ring-2 ring-offset-1 ring-gray-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Fuente</Label>
                <Select
                  value={filters.source || 'all'}
                  onValueChange={(value) => onFilterChange({ ...filters, source: value === 'all' ? '' : value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {SOURCES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Patient Type */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Tipo de paciente</Label>
                <Select
                  value={filters.patient_type || 'all'}
                  onValueChange={(value) => onFilterChange({ ...filters, patient_type: value === 'all' ? '' : value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {PATIENT_TYPES.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget range */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Presupuesto (€)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.budget_min || ''}
                    onChange={(e) => onFilterChange({ ...filters, budget_min: e.target.value })}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.budget_max || ''}
                    onChange={(e) => onFilterChange({ ...filters, budget_max: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && !compact && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}