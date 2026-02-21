import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import PatientCard from './PatientCard';
import { formatCurrency } from './constants';

export default function KanbanColumn({ 
  state, 
  patients, 
  onPatientClick,
  config = {}
}) {
  const totalBudget = patients.reduce((sum, p) => sum + (p.budget_amount || 0), 0);

  return (
    <div className={`flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-xl ${state.isRejected ? 'opacity-75' : ''}`}>
      {/* Column header */}
      <div className={`p-3 rounded-t-xl ${state.isRejected ? 'bg-gray-200' : 'bg-white'} border-b`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm ${state.isRejected ? 'text-gray-600' : 'text-gray-900'}`}>
            {state.label}
          </h3>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${state.color}`}>
            {patients.length}
          </span>
        </div>
        {totalBudget > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(totalBudget)}
          </p>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={state.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]
              transition-colors duration-200
              ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}
            `}
          >
            {patients.map((patient, index) => (
              <Draggable key={patient.id} draggableId={patient.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                    className={`${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}`}
                  >
                    <PatientCard
                      patient={patient}
                      onClick={() => onPatientClick(patient)}
                      config={config}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {patients.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                Sin pacientes
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}