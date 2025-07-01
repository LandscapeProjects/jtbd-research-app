import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, BookOpen, Save, Loader2, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ForceInputSection } from '../components/forces/ForceInputSection';
import { useProjectStore } from '../store/projectStore';
import type { Story, ForceType } from '../lib/database.types';

export function Stories() {
  const { projectId } = useParams<{ projectId: string }>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    interview_id: '',
    title: '',
    description: '',
    situation_a: '',
    situation_b: '',
  });

  const { 
    currentProject,
    interviews,
    stories,
    forces,
    fetchInterviews,
    fetchStories,
    fetchForces,
    createStory,
    updateStory,
    createForce,
    updateForce,
    deleteForce,
    loading
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchInterviews(projectId);
      fetchStories(projectId);
      fetchForces(projectId);
    }
  }, [projectId, fetchInterviews, fetchStories, fetchForces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setSaving(true);
    try {
      if (editingStory) {
        await updateStory(editingStory.id, formData);
        setEditingStory(null);
      } else {
        await createStory({
          interview_id: formData.interview_id,
          title: formData.title,
          description: formData.description,
          situation_a: formData.situation_a,
          situation_b: formData.situation_b,
        });
      }

      setFormData({
        interview_id: '',
        title: '',
        description: '',
        situation_a: '',
        situation_b: '',
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving story:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setFormData({
      interview_id: story.interview_id,
      title: story.title,
      description: story.description,
      situation_a: story.situation_a,
      situation_b: story.situation_b,
    });
    setIsFormOpen(true);
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

  const getInterviewName = (interviewId: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    return interview?.participant_name || 'Unknown';
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

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingStory(null);
    setFormData({
      interview_id: '',
      title: '',
      description: '',
      situation_a: '',
      situation_b: '',
    });
  };

  return (
    <Layout projectId={projectId}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stories & Forces</h1>
            <p className="text-gray-600 mt-1">
              Capture participant stories and the forces that drive their decisions
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </button>
        </div>

        {/* Project Stats */}
        {stories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Stories</p>
                  <p className="text-2xl font-semibold text-gray-900">{stories.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Complete Stories</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stories.filter(s => getStoryCompleteness(s.id).isComplete).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">F</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Forces</p>
                  <p className="text-2xl font-semibold text-gray-900">{forces.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Need Attention</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stories.filter(s => !getStoryCompleteness(s.id).isComplete).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Story Form */}
        {isFormOpen && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingStory ? 'Edit Story' : 'Add New Story'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Participant *
                </label>
                <select
                  required
                  value={formData.interview_id}
                  onChange={(e) => setFormData({ ...formData, interview_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an interview</option>
                  {interviews.map((interview) => (
                    <option key={interview.id} value={interview.id}>
                      {interview.participant_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Switching to electric vehicle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the story context..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Situation A (Current State) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.situation_a}
                    onChange={(e) => setFormData({ ...formData, situation_a: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the current situation..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Situation B (Desired State) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.situation_b}
                    onChange={(e) => setFormData({ ...formData, situation_b: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the desired outcome..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
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
                  {editingStory ? 'Update Story' : 'Add Story'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stories List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : stories.length > 0 ? (
          <div className="space-y-8">
            {stories.map((story) => {
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
                          <h3 className="text-xl font-semibold text-gray-900">{story.title}</h3>
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
                        <p className="text-sm text-gray-600 mb-1">by {getInterviewName(story.interview_id)}</p>
                        <p className="text-gray-700">{story.description}</p>
                      </div>
                      <button
                        onClick={() => handleEdit(story)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Situations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Situation A (Current)
                        </h4>
                        <p className="text-gray-700 text-sm">{story.situation_a}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Situation B (Desired)
                        </h4>
                        <p className="text-gray-700 text-sm">{story.situation_b}</p>
                      </div>
                    </div>
                  </div>

                  {/* Forces Section */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Forces Analysis</h4>
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
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stories yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              {interviews.length === 0 
                ? 'Add interviews first, then capture their stories.'
                : 'Start capturing stories from your interviews.'
              }
            </p>
            {interviews.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Story
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}