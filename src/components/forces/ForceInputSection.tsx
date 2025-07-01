import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, ArrowUp, ArrowDown, Circle, AlertTriangle, Loader2, Check } from 'lucide-react';
import type { Force, ForceType } from '../../lib/database.types';

interface ForceInputSectionProps {
  storyId: string;
  type: ForceType;
  forces: Force[];
  onAddForce: (description: string) => Promise<void>;
  onDeleteForce: (forceId: string) => Promise<void>;
  onUpdateForce: (forceId: string, description: string) => Promise<void>;
}

const forceConfig = {
  push: {
    label: 'Pushes',
    description: 'What pushes them to seek a solution?',
    icon: ArrowUp,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    placeholder: 'e.g., High gas prices, environmental concerns...',
    emoji: '🔴',
  },
  pull: {
    label: 'Pulls',
    description: 'What attracts them to this solution?',
    icon: ArrowDown,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    placeholder: 'e.g., Government incentives, modern technology...',
    emoji: '🟢',
  },
  habit: {
    label: 'Habits',
    description: 'What existing habits influence the decision?',
    icon: Circle,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    placeholder: 'e.g., Charging phone daily, short commutes...',
    emoji: '🟡',
  },
  anxiety: {
    label: 'Anxieties',
    description: 'What concerns or fears do they have?',
    icon: AlertTriangle,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    placeholder: 'e.g., Range anxiety, charging availability...',
    emoji: '🟣',
  },
};

export function ForceInputSection({ 
  storyId, 
  type, 
  forces, 
  onAddForce, 
  onDeleteForce,
  onUpdateForce
}: ForceInputSectionProps) {
  const [isExpanded, setIsExpanded] = useState(forces.length > 0);
  const [newForce, setNewForce] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
  
  const config = forceConfig[type];
  const Icon = config.icon;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forces.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [forces.length]);

  const handleAdd = async () => {
    if (!newForce.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddForce(newForce.trim());
      setNewForce('');
      setIsExpanded(true);
    } catch (error) {
      console.error('Error adding force:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (forceId: string) => {
    setSavingStates(prev => ({ ...prev, [forceId]: true }));
    try {
      await onDeleteForce(forceId);
    } catch (error) {
      console.error('Error deleting force:', error);
    } finally {
      setSavingStates(prev => ({ ...prev, [forceId]: false }));
    }
  };

  const handleEdit = (force: Force) => {
    setEditingId(force.id);
    setEditingValue(force.description);
  };

  const handleSaveEdit = async (forceId: string) => {
    if (!editingValue.trim()) return;
    
    setSavingStates(prev => ({ ...prev, [forceId]: true }));
    try {
      await onUpdateForce(forceId, editingValue.trim());
      setEditingId(null);
      setEditingValue('');
      
      // Show saved indicator
      setSavedStates(prev => ({ ...prev, [forceId]: true }));
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [forceId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error updating force:', error);
    } finally {
      setSavingStates(prev => ({ ...prev, [forceId]: false }));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit', forceId?: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'add') {
        handleAdd();
      } else if (action === 'edit' && forceId) {
        handleSaveEdit(forceId);
      }
    } else if (e.key === 'Escape' && action === 'edit') {
      handleCancelEdit();
    }
  };

  const isEmpty = forces.length === 0;
  const isRequired = type === 'push' || type === 'pull';

  return (
    <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-xl transition-all duration-200 ${
      isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
    }`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <h3 className={`font-semibold ${config.textColor} text-lg`}>
                {config.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isEmpty 
                  ? 'bg-gray-100 text-gray-800' 
                  : `bg-${config.color}-100 text-${config.color}-800`
              }`}>
                {forces.length} {forces.length === 1 ? 'item' : 'items'}
              </span>
              {isRequired && (
                <div className="flex items-center">
                  {forces.length > 0 ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              )}
            </div>
            <Icon className={`h-5 w-5 ${config.textColor} transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Existing Forces */}
          {forces.length > 0 && (
            <div className="space-y-2">
              {forces.map((force) => (
                <div
                  key={force.id}
                  className="flex items-start space-x-3 bg-white rounded-lg p-3 shadow-sm border border-gray-200 group hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1">
                    {editingId === force.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, 'edit', force.id)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder={config.placeholder}
                          autoFocus
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSaveEdit(force.id)}
                            disabled={savingStates[force.id] || !editingValue.trim()}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {savingStates[force.id] ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <p 
                          className="text-sm text-gray-800 flex-1 cursor-pointer hover:text-gray-600 transition-colors"
                          onClick={() => handleEdit(force)}
                        >
                          {force.description}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          {savedStates[force.id] && (
                            <Check className="h-4 w-4 text-green-600 animate-pulse" />
                          )}
                          <button
                            onClick={() => handleDelete(force.id)}
                            disabled={savingStates[force.id]}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-200 disabled:cursor-not-allowed"
                          >
                            {savingStates[force.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Force */}
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={newForce}
              onChange={(e) => setNewForce(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'add')}
              placeholder={config.placeholder}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={!newForce.trim() || isAdding}
              className={`px-4 py-2 ${config.buttonColor} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-medium`}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add {config.label.slice(0, -1)}
            </button>
          </div>

          {/* Empty State */}
          {isEmpty && (
            <div className="text-center py-6">
              <Icon className={`mx-auto h-8 w-8 ${config.textColor} opacity-50 mb-2`} />
              <p className="text-sm text-gray-600">
                No {config.label.toLowerCase()} added yet
                {isRequired && (
                  <span className="block text-amber-600 font-medium mt-1">
                    At least one {config.label.slice(0, -1).toLowerCase()} is required
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}