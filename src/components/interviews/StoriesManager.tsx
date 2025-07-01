import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, CheckCircle, AlertTriangle, Edit3, Save, X, Loader2 } from 'lucide-react';
import { ForceInputSection } from '../forces/ForceInputSection';
import { useProjectStore } from '../../store/projectStore';
import type { Story, ForceType } from '../../lib/database.types';

interface StoriesManagerProps {
  interviewId: string;
  participantName: string;
  projectId: string;
}

export function StoriesManager({ interviewId, participantName, projectId }: StoriesManagerProps) {
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [saving, setSaving] = useState(false);
  const [newStoryData, setNewStoryData] = useState({
    title: '',
    description: '',
    situation_a: '',
    situation_b: '',
  });

  const {
    stories,
    forces,
    fetchStories,
    fetchForces,
    createStory,
    updateStory,
    createForce,
    updateForce,
    deleteForce,
  } = useProjectStore();

  // Filter stories for this interview
  const interviewStories = stories.filter(s => s.interview_id === interviewId);

  useEffect(() => {
    fetchStories(projectId);
    fetchForces(projectId);
  }, [projectId, fetchStories, fetchForces]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryData.title.trim()) return;

    setSaving(true);
    try {
      await createStory({
        interview_id: interviewId,
        title: newStoryData.title,
        description: newStoryData.description,
        situation_a: newStoryData.situation_a,
        situation_b: newStoryData.situation_b,
      });

      setNewStoryData({
        title: '',
        description: '',
        situation_a: '',
        situation_b: '',
      });
      setIsAddingStory(false);
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;

    setSaving(true);
    try {
      await updateStory(editingStory.id, newStoryData);
      setEditingStory(null);
      setNewStoryData({
        title: '',
        description: '',
        situation_a: '',
        situation_b: '',
      });
    } catch (error) {
      console.error('Error updating story:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setNewStoryData({
      title: story.title,
      description: story.description,
      situation_a: story.situation_a,
      situation_b: story.situation_b,
    });
    setIsAddingStory(true);
  };

  const handleCancelEdit = () => {
    setEditingStory(null);
    setIsAddingStory(false);
    setNewStoryData({
      title: '',
      description: '',
      situation_a: '',
      situation_b: '',
    });
  };

  const handleAddForce = async (storyId: string, type: ForceType, description: string) => {
    await createForce(storyId, type, description);
  };

  const handleUpdateForce = async (forceId: string, description: string) => {
    await updateForce(forceId, { description });
  };

  const handleDeleteForce = async (forceId: string) => {
    await deleteForce(forceId);
  };

  const getStoryForces = (storyId: string, type: ForceType) => {
    return forces.filter(f => f.story_id === storyId && f.type === type);
  };

  const getStoryCompleteness = (storyId: string) => {
    const pushes = getStoryForces(storyId, 'push');
    const pulls = getStoryForces(storyId, 'pull');
    const habits = getStoryForces(storyId, 'habit');
    const anxieties = getStoryForces(storyId, 'anxiety');
    
    const hasRequiredForces = pushes.length > 0 && pulls.length > 0;
    const totalForces = pushes.length + pulls.length + habits.length + anxieties.length;
    
    return {
      isComplete: hasRequiredForces,
      hasRequiredForces,
      totalForces,
      pushCount: pushes.length,
      pullCount: pulls.length,
      habitCount: habits.length,
      anxietyCount: anxieties.length,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Stories from {participantName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Capture the participant's decision-making stories and the forces that influence them
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {interviewStories.length} {interviewStories.length === 1 ? 'story' : 'stories'}
          </span>
          <button
            onClick={() => setIsAddingStory(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Story
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {interviewStories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-700">Total Stories</p>
                <p className="text-xl font-semibold text-blue-900">{interviewStories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-700">Complete</p>
                <p className="text-xl font-semibold text-green-900">
                  {interviewStories.filter(s => getStoryCompleteness(s.id).isComplete).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-amber-700">Need Forces</p>
                <p className="text-xl font-semibold text-amber-900">
                  {interviewStories.filter(s => !getStoryCompleteness(s.id).isComplete).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Story Form */}
      {isAddingStory && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {editingStory ? 'Edit Story' : 'Add New Story'}
            </h4>
            <button
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={editingStory ? handleUpdateStory : handleCreateStory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Story Title *
              </label>
              <input
                type="text"
                required
                value={newStoryData.title}
                onChange={(e) => setNewStoryData({ ...newStoryData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Switching from Netflix to Disney+"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                rows={3}
                required
                value={newStoryData.description}
                onChange={(e) => setNewStoryData({ ...newStoryData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the story context and decision..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🅰️ Situation A (Current State) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newStoryData.situation_a}
                  onChange={(e) => setNewStoryData({ ...newStoryData, situation_a: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe their current situation..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🅱️ Situation B (Desired State) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newStoryData.situation_b}
                  onChange={(e) => setNewStoryData({ ...newStoryData, situation_b: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe their desired outcome..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingStory ? 'Update Story' : 'Create Story'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stories List */}
      {interviewStories.length > 0 ? (
        <div className="space-y-6">
          {interviewStories.map((story, index) => {
            const completeness = getStoryCompleteness(story.id);
            
            return (
              <div
                key={story.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                {/* Story Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900">{story.title}</h4>
                        <div className="flex items-center space-x-2">
                          {completeness.isComplete ? (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              <CheckCircle className="h-3 w-3" />
                              <span>Complete</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Needs Forces</span>
                            </div>
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {completeness.totalForces} forces
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4">{story.description}</p>

                      {/* Situations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h5 className="font-medium text-red-700 mb-2 flex items-center text-sm">
                            🅰️ Current Situation
                          </h5>
                          <p className="text-gray-700 text-sm">{story.situation_a}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h5 className="font-medium text-green-700 mb-2 flex items-center text-sm">
                            🅱️ Desired Situation
                          </h5>
                          <p className="text-gray-700 text-sm">{story.situation_b}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditStory(story)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors ml-4"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Forces Section */}
                <div className="p-6">
                  <div className="mb-4">
                    <h5 className="text-md font-semibold text-gray-900 mb-2">Forces Analysis</h5>
                    <p className="text-sm text-gray-600">
                      Capture the forces that influence this decision. At least one Push and one Pull are required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ForceInputSection
                      storyId={story.id}
                      type="push"
                      forces={getStoryForces(story.id, 'push')}
                      onAddForce={(description) => handleAddForce(story.id, 'push', description)}
                      onUpdateForce={handleUpdateForce}
                      onDeleteForce={handleDeleteForce}
                    />
                    <ForceInputSection
                      storyId={story.id}
                      type="pull"
                      forces={getStoryForces(story.id, 'pull')}
                      onAddForce={(description) => handleAddForce(story.id, 'pull', description)}
                      onUpdateForce={handleUpdateForce}
                      onDeleteForce={handleDeleteForce}
                    />
                    <ForceInputSection
                      storyId={story.id}
                      type="habit"
                      forces={getStoryForces(story.id, 'habit')}
                      onAddForce={(description) => handleAddForce(story.id, 'habit', description)}
                      onUpdateForce={handleUpdateForce}
                      onDeleteForce={handleDeleteForce}
                    />
                    <ForceInputSection
                      storyId={story.id}
                      type="anxiety"
                      forces={getStoryForces(story.id, 'anxiety')}
                      onAddForce={(description) => handleAddForce(story.id, 'anxiety', description)}
                      onUpdateForce={handleUpdateForce}
                      onDeleteForce={handleDeleteForce}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-2 text-lg font-medium text-gray-900">No stories yet</h4>
          <p className="mt-1 text-sm text-gray-500">
            Start capturing {participantName}'s decision-making stories and the forces that drive them.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsAddingStory(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}