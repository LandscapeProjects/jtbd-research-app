import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, Minus } from 'lucide-react';
import type { ForceGroup, Force } from '../../lib/database.types';

interface GroupValidationQuestionProps {
  group: ForceGroup;
  groupForces: Force[];
  currentResponse: boolean | null;
  onResponseChange: (groupId: string, response: boolean | null) => void;
}

export function GroupValidationQuestion({
  group,
  groupForces,
  currentResponse,
  onResponseChange
}: GroupValidationQuestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = {
    push: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
    },
    pull: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
    },
  };

  const config = typeConfig[group.type];

  const getResponseIcon = (response: boolean | null) => {
    switch (response) {
      case true:
        return <Check className="h-4 w-4 text-green-600" />;
      case false:
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getResponseColor = (response: boolean | null) => {
    switch (response) {
      case true:
        return 'border-green-500 bg-green-50';
      case false:
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  return (
    <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg transition-all duration-200`}>
      {/* Question Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {getResponseIcon(currentResponse)}
              <h4 className="font-medium text-gray-900">{group.name}</h4>
            </div>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {groupForces.length} forces
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Response Buttons */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            Does this story match this group?
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onResponseChange(group.id, true)}
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 ${
                currentResponse === true
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <Check className="h-4 w-4" />
              <span className="font-medium">YES</span>
            </button>
            
            <button
              onClick={() => onResponseChange(group.id, false)}
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 ${
                currentResponse === false
                  ? 'border-red-500 bg-red-100 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <X className="h-4 w-4" />
              <span className="font-medium">NO</span>
            </button>
            
            <button
              onClick={() => onResponseChange(group.id, null)}
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 ${
                currentResponse === null
                  ? 'border-gray-500 bg-gray-100 text-gray-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <Minus className="h-4 w-4" />
              <span className="font-medium">SKIP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Force Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <h5 className="text-sm font-medium text-gray-900 mb-3">
            Forces in this group:
          </h5>
          <div className="space-y-2">
            {groupForces.map((force) => (
              <div
                key={force.id}
                className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg"
              >
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">{force.description}</p>
              </div>
            ))}
          </div>
          {groupForces.length === 0 && (
            <p className="text-sm text-gray-500 italic">No forces in this group</p>
          )}
        </div>
      )}
    </div>
  );
}