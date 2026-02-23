import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';

const PRESET_OPTIONS = [
  { id: 'current_month', label: 'Mes en curso' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'current_quarter', label: 'Trimestre actual' },
  { id: 'last_quarter', label: 'Trimestre anterior' },
  { id: 'current_year', label: 'Año en curso' },
  { id: 'custom', label: 'Personalizado' }
];

export default function DateFilter({ dateRange, onDateRangeChange, onlyNewInPeriod, onOnlyNewInPeriodChange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [preset, setPreset] = useState('current_month');

  const getDateRangeForPreset = (presetId) => {
    const now = new Date();
    let start, end;

    switch (presetId) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'current_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const quarter = lastQuarter < 0 ? 3 : lastQuarter;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        return null;
    }

    return { from: start, to: end };
  };

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value !== 'custom') {
      const range = getDateRangeForPreset(value);
      onDateRangeChange(range);
    }
  };

  const handleCustomDateChange = (range) => {
    if (range?.from && range?.to) {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
      onDateRangeChange({ from, to });
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from || !dateRange?.to) return 'Seleccionar período';
    
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const from = dateRange.from.toLocaleDateString('es-ES', options);
    const to = dateRange.to.toLocaleDateString('es-ES', options);
    
    return `${from} - ${to}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESET_OPTIONS.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === 'custom' && (
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              {formatDateRange()}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleCustomDateChange}
              numberOfMonths={2}
              locale="es"
            />
          </PopoverContent>
        </Popover>
      )}

      {!['custom'].includes(preset) && (
        <div className="text-sm text-gray-500 px-3 py-1.5 bg-gray-50 rounded-lg">
          {formatDateRange()}
        </div>
      )}

      <div className="flex items-center gap-2 ml-2">
        <Checkbox
          id="only-new"
          checked={onlyNewInPeriod}
          onCheckedChange={onOnlyNewInPeriodChange}
        />
        <Label htmlFor="only-new" className="text-sm font-normal cursor-pointer">
          Sólo altas periodo
        </Label>
      </div>
    </div>
  );
}