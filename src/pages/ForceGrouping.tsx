import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Save,
  Loader2
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DraggableForce } from '../components/grouping/DraggableForce';
import { DroppableGroup } from '../components/grouping/DroppableGroup';
import { useProjectStore } from '../store/projectStore';
import type { Force, ForceGroup } from '../lib/database.types';

export function ForceGrouping() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedForce, setDraggedForce] = useState<Force | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const {
    currentProject,
    forces,
    forceGroups,
    stories,
    interviews,
    fetchForces,
    fetchForceGroups,
    fetchStories,
    fetchInterviews,
    createForceGroup,
    updateForceGroup,
    assignForceToGroup,
    loading
  } = useProjectStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (projectId) {
      fetchForces(projectId);
      fetchForceGroups(projectId);
      fetchStories(projectId);
      fetchInterviews(projectId);
      initializeGroups();
    }
  }, [projectId]);

  const initializeGroups = async () => {
    if (!projectId) return;

    // Create default groups if they don't exist
    const pushGroups = forceGroups.filter(g => g.type === 'push');
    const pullGroups = forceGroups.filter(g => g.type === 'pull');

    // Create 11 push groups (10 regular + 1 leftover)
    if (pushGroups.length === 0) {
      for (let i = 1; i <= 10; i++) {
        await createForceGroup(projectId, `Push Group ${i}`, 'push');
      }
      await createForceGroup(projectId, 'Push Leftovers', 'push');
    }

    // Create 11 pull groups (10 regular + 1 leftover)
    if (pullGroups.length === 0) {
      for (let i = 1; i <= 10; i++) {
        await createForceGroup(projectId, `Pull Group ${i}`, 'pull');
      }
      await createForceGroup(projectId, 'Pull Leftovers', 'pull');
    }
  };

  const getUngroupedForces = (type: 'push' | 'pull') => {
    return forces.filter(f => f.type === type && !f.group_id);
  };

  const getGroupedForces = (groupId: string) => {
    return forces.filter(f => f.group_id === groupId);
  };

  const getStoryInfo = (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story) return { title: 'Unknown Story', participantName: 'Unknown' };
    
    const interview = interviews.find(i => i.id === story.interview_id);
    return {
      title: story.title,
      participantName: interview?.participant_name || 'Unknown'
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const force = forces.find(f => f.id === active.id);
    setDraggedForce(force || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedForce(null);
      return;
    }

    const forceId = active.id as string;
    const targetId = over.id as string;

    // Check if dropping on a group
    const targetGroup = forceGroups.find(g => g.id === targetId);
    
    if (targetGroup) {
      setAutoSaving(true);
      try {
        await assignForceToGroup(forceId, targetGroup.id);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error assigning force to group:', error);
      } finally {
        setAutoSaving(false);
      }
    }

    setActiveId(null);
    setDraggedForce(null);
  };

  const handleGroupNameChange = async (groupId: string, newName: string) => {
    try {
      await updateForceGroup(groupId, { name: newName });
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  };

  const handleResetForce = async (forceId: string) => {
    setAutoSaving(true);
    try {
      await assignForceToGroup(forceId, null);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error resetting force:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const getGroupingStats = (type: 'push' | 'pull') => {
    const typeForces = forces.filter(f => f.type === type);
    const groupedCount = typeForces.filter(f => f.group_id).length;
    const totalCount = typeForces.length;
    const percentage = totalCount > 0 ? Math.round((groupedCount / totalCount) * 100) : 0;
    
    return { groupedCount, totalCount, percentage };
  };

  const pushStats = getGroupingStats('push');
  const pullStats = getGroupingStats('pull');
  const pushGroups = forceGroups.filter(g => g.type === 'push');
  const pullGroups = forceGroups.filter(g => g.type === 'pull');

  if (loading) {
    return (
      <Layout projectId={projectId}>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout projectId={projectId}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Force Grouping</h1>
              <p className="text-gray-600 mt-1">
                Drag forces into thematic groups to identify patterns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              {lastSaved && !autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ArrowUp className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Push Forces</h3>
              </div>
              <span className="text-2xl font-bold text-blue-600">{pushStats.percentage}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Grouped: {pushStats.groupedCount}</span>
                <span>Total: {pushStats.totalCount}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pushStats.percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ArrowDown className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Pull Forces</h3>
              </div>
              <span className="text-2xl font-bold text-green-600">{pullStats.percentage}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-green-700">
                <span>Grouped: {pullStats.groupedCount}</span>
                <span>Total: {pullStats.totalCount}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pullStats.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Push Forces Section */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <ArrowUp className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Push Forces</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {getUngroupedForces('push').length} ungrouped
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Ungrouped Push Forces */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 h-96 overflow-y-auto">
                  <h3 className="font-medium text-gray-900 mb-4">Ungrouped Push Forces</h3>
                  <SortableContext
                    items={getUngroupedForces('push').map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {getUngroupedForces('push').map((force) => {
                        const storyInfo = getStoryInfo(force.story_id);
                        return (
                          <DraggableForce
                            key={force.id}
                            force={force}
                            storyTitle={storyInfo.title}
                            participantName={storyInfo.participantName}
                            type="push"
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  {getUngroupedForces('push').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">All push forces grouped!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Push Groups Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pushGroups.map((group) => (
                    <DroppableGroup
                      key={group.id}
                      group={group}
                      forces={getGroupedForces(group.id)}
                      onGroupNameChange={handleGroupNameChange}
                      onResetForce={handleResetForce}
                      getStoryInfo={getStoryInfo}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pull Forces Section */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <ArrowDown className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pull Forces</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {getUngroupedForces('pull').length} ungrouped
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Ungrouped Pull Forces */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 h-96 overflow-y-auto">
                  <h3 className="font-medium text-gray-900 mb-4">Ungrouped Pull Forces</h3>
                  <SortableContext
                    items={getUngroupedForces('pull').map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {getUngroupedForces('pull').map((force) => {
                        const storyInfo = getStoryInfo(force.story_id);
                        return (
                          <DraggableForce
                            key={force.id}
                            force={force}
                            storyTitle={storyInfo.title}
                            participantName={storyInfo.participantName}
                            type="pull"
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  {getUngroupedForces('pull').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">All pull forces grouped!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pull Groups Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pullGroups.map((group) => (
                    <DroppableGroup
                      key={group.id}
                      group={group}
                      forces={getGroupedForces(group.id)}
                      onGroupNameChange={handleGroupNameChange}
                      onResetForce={handleResetForce}
                      getStoryInfo={getStoryInfo}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && draggedForce ? (
              <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg transform rotate-3">
                <p className="text-sm font-medium text-gray-900">{draggedForce.description}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Completion Status */}
        {pushStats.percentage === 100 && pullStats.percentage === 100 && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Grouping Complete!</h3>
                <p className="text-green-700">
                  All forces have been grouped. You can now proceed to the Matrix Validation phase.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}