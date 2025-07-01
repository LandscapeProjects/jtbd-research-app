import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, User, BookOpen } from 'lucide-react';
import type { Force } from '../../lib/database.types';

interface DraggableForceProps {
  force: Force;
  storyTitle: string;
  participantName: string;
  type: 'push' | 'pull';
}

export function DraggableForce({ force, storyTitle, participantName, type }: DraggableForceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: force.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = {
    push: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      hoverColor: 'hover:bg-blue-100',
    },
    pull: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      hoverColor: 'hover:bg-green-100',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${config.bgColor} ${config.borderColor} ${config.hoverColor}
        border-2 rounded-lg p-3 cursor-grab active:cursor-grabbing
        transition-all duration-200 shadow-sm hover:shadow-md
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start space-x-2">
        <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
            {force.description}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span className="truncate">{participantName}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <BookOpen className="h-3 w-3" />
              <span className="truncate">{storyTitle}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}