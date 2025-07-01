import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  Package,
  Trash2
} from 'lucide-react';
import type { Force, ForceGroup } from '../../lib/database.types';

interface DroppableGroupProps {
  group: ForceGroup;
  forces: Force[];
  onGroupNameChange: (groupId: string, newName: string) => void;
  onResetForce: (forceId: string) => void;
  getStoryInfo: (storyId: string) => { title: string; participantName: string };
}

export function DroppableGroup({ 
  group, 
  forces, 
  onGroupNameChange, 
  onResetForce,
  getStoryInfo 
}: DroppableGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  
  const { isOver, setNodeRef } = useDroppable({
    id: group.id,
  });

  const handleSaveName = () => {
    if (editName.trim() && editName !== group.name) {
      onGroupNameChange(group.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const isLeftover = group.name.toLowerCase().includes('leftover');
  const isEmpty = forces.length === 0;
  
  const typeConfig = {
    push: {
      bgColor: isEmpty ? 'bg-blue-50' : 'bg-blue-100',
      borderColor: isOver ? 'border-blue-500' : 'border-blue-200',
      headerColor: 'bg-blue-600',
      textColor: 'text-blue-700',
      countColor: 'bg-blue-500',
    },
    pull: {
      bgColor: isEmpty ? 'bg-green-50' : 'bg-green-100',
      borderColor: isOver ? 'border-green-500' : 'border-green-200',
      headerColor: 'bg-green-600',
      textColor: 'text-green-700',
      countColor: 'bg-green-500',
    },
  };

  const config = typeConfig[group.type];

  return (
    <div
      ref={setNodeRef}
      className={`
        ${config.bgColor} ${config.borderColor}
        border-2 rounded-xl transition-all duration-200 h-80 flex flex-col
        ${isOver ? 'shadow-lg scale-105' : 'shadow-sm hover:shadow-md'}
        ${isLeftover ? 'border-dashed' : ''}
      `}
    >
      {/* Group Header */}
      <div className={`${config.headerColor} text-white p-3 rounded-t-lg flex items-center justify-between`}>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSaveName}
              className="w-full px-2 py-1 text-sm bg-white text-gray-900 rounded border-0 focus:ring-2 focus:ring-white"
              autoFocus
            />
          ) : (
            <h3 
              className="font-medium text-sm truncate cursor-pointer hover:text-gray-200 transition-colors"
              onClick={() => setIsEditing(true)}
              title={group.name}
            >
              {group.name}
            </h3>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveName}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <span className={`${config.countColor} text-white px-2 py-0.5 rounded-full text-xs font-medium`}>
                {forces.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Group Content */}
      <div className="flex-1 p-3 overflow-y-auto">
        <SortableContext
          items={forces.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {forces.map((force) => {
              const storyInfo = getStoryInfo(force.story_id);
              return (
                <div
                  key={force.id}
                  className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 group hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 mb-1 line-clamp-2">
                        {force.description}
                      </p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div className="truncate">{storyInfo.participantName}</div>
                        <div className="truncate">{storyInfo.title}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onResetForce(force.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                      title="Remove from group"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>

        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="h-8 w-8 mb-2" />
            <p className="text-xs text-center">
              {isLeftover ? 'Leftover forces' : 'Drop forces here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}