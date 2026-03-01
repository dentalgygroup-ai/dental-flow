import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function SystemConfigManager({ configType, title, description, items, onRefresh, clinicId }) {
  const [newItem, setNewItem] = useState({ value: '', label: '' });
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!newItem.value || !newItem.label) {
      toast({
        title: "Error",
        description: "Complete todos los campos",
        variant: "destructive"
      });
      return;
    }

    await base44.entities.SystemConfig.create({
      clinic_id: clinicId,
      config_type: configType,
      value: newItem.value,
      label: newItem.label,
      is_active: true,
      order: items.length
    });

    setNewItem({ value: '', label: '' });
    setShowAdd(false);
    onRefresh();
    
    toast({
      title: "Opción añadida",
      duration: 2000
    });
  };

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar "${item.label}"?`)) return;
    
    await base44.entities.SystemConfig.delete(item.id);
    onRefresh();
    
    toast({
      title: "Opción eliminada",
      duration: 2000
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="p-3 border rounded-lg bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="ID (ej: implantes)"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              />
              <Input
                placeholder="Etiqueta (ej: Implantes)"
                value={newItem.label}
                onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="w-4 h-4 mr-1" />
                Añadir
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setShowAdd(false);
                setNewItem({ value: '', label: '' });
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-gray-500">{item.value}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay opciones configuradas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}