import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Users, Calendar, User, CheckCircle, AlertTriangle, BookOpen, ArrowDown, X } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { StoriesManager } from '../components/interviews/StoriesManager';
import { useProjectStore } from '../store/projectStore';
import type { Interview } from '../lib/database.types';

export function Interviews() {
  const { projectId } = useParams<{ projectId: string }>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_age: '',
    participant_gender: '',
    interview_date: new Date().toISOString().split('T')[0],
    context: '',
  });

  const storiesSectionRef = useRef<HTMLDivElement>(null);

  const { 
    currentProject, 
    interviews, 
    stories,
    forces,
    fetchInterviews, 
    fetchStories,
    fetchForces,
    createInterview,
    loading 
  } = useProjectStore();

  // FIXED: Stable useEffect with proper dependencies
  useEffect(() => {
    if (projectId) {
      console.log('🔄 Loading interview data for project:', projectId);
      
      // Use Promise.all to avoid race conditions
      Promise.all([
        fetchInterviews(projectId),
        fetchStories(projectId),
        fetchForces(projectId)
      ]).catch(error => {
        console.error('Error loading interview data:', error);
      });
    }
  }, [projectId]); // FIXED: Only depend on projectId, not the functions

  const handleNewInterviewClick = () => {
    console.log('🎯 New Interview button clicked');
    
    // Reset any existing state
    setCurrentInterview(null);
    setSelectedInterviewId(null);
    setFormData({
      participant_name: '',
      participant_age: '',
      participant_gender: '',
      interview_date: new Date().toISOString().split('T')[0],
      context: '',
    });
    
    // Open the form
    setIsFormOpen(true);
    console.log('✅ Form opened');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted with data:', formData);
    
    if (!projectId) {
      console.error('❌ No project ID available');
      return;
    }

    // FIXED: Prevent multiple submissions
    if (loading) {
      console.log('⚠️ Already submitting, ignoring duplicate submission');
      return;
    }

    try {
      console.log('🚀 Creating interview...');
      const interview = await createInterview({
        project_id: projectId,
        participant_name: formData.participant_name,
        participant_age: formData.participant_age ? parseInt(formData.participant_age) : null,
        participant_gender: formData.participant_gender || null,
        interview_date: formData.interview_date,
        context: formData.context,
      });

      console.log('✅ Interview created:', interview);

      // Set as current interview and scroll to stories section
      setCurrentInterview(interview);
      setIsFormOpen(false);
      
      // Reset form
      setFormData({
        participant_name: '',
        participant_age: '',
        participant_gender: '',
        interview_date: new Date().toISOString().split('T')[0],
        context: '',
      });

      // Scroll to stories section after a brief delay
      setTimeout(() => {
        storiesSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

    } catch (error) {
      console.error('💥 Error creating interview:', error);
    }
  };

  const handleSelectExistingInterview = (interview: Interview) => {
    console.log('📋 Selected existing interview:', interview.participant_name);
    setCurrentInterview(interview);
    setSelectedInterviewId(interview.id);
    
    // Scroll to stories section
    setTimeout(() => {
      storiesSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const getInterviewStats = (interviewId: string) => {
    const interviewStories = stories.filter(s => s.interview_id === interviewId);
    const storyIds = interviewStories.map(s => s.id);
    const interviewForces = forces.filter(f => storyIds.includes(f.story_id));
    
    const completeStories = interviewStories.filter(story => {
      const pushes = forces.filter(f => f.story_id === story.id && f.type === 'push');
      const pulls = forces.filter(f => f.story_id === story.id && f.type === 'pull');
      return pushes.length > 0 && pulls.length > 0;
    });

    return {
      storyCount: interviewStories.length,
      forceCount: interviewForces.length,
      completeStories: completeStories.length,
      isComplete: interviewStories.length > 0 && completeStories.length === interviewStories.length,
      hasStories: interviewStories.length > 0
    };
  };

  const resetForm = () => {
    console.log('🔄 Resetting form');
    setIsFormOpen(false);
    setCurrentInterview(null);
    setSelectedInterviewId(null);
    setFormData({
      participant_name: '',
      participant_age: '',
      participant_gender: '',
      interview_date: new Date().toISOString().split('T')[0],
      context: '',
    });
  };

  return (
    <Layout projectId={projectId}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Documentation</h1>
            <p className="text-gray-600 mt-1">
              Create interviews and capture participant stories in one integrated workflow
            </p>
          </div>
          <button
            onClick={handleNewInterviewClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center shadow-sm"
            type="button"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Interview
          </button>
        </div>

        {/* Debug Info - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <strong>Debug:</strong> Form Open: {isFormOpen ? 'YES' : 'NO'} | 
            Current Interview: {currentInterview?.participant_name || 'None'} | 
            Interviews: {interviews.length} | Loading: {loading ? 'YES' : 'NO'}
          </div>
        )}

        {/* Project Overview Stats */}
        {interviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Interviews</p>
                  <p className="text-2xl font-semibold text-gray-900">{interviews.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Stories</p>
                  <p className="text-2xl font-semibold text-gray-900">{stories.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Complete Interviews</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {interviews.filter(i => getInterviewStats(i.id).isComplete).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">F</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Forces</p>
                  <p className="text-2xl font-semibold text-gray-900">{forces.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Interview Creation Form */}
        {isFormOpen && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📋 Create New Interview</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.participant_name}
                    onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Ana Martinez"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.participant_age}
                    onChange={(e) => setFormData({ ...formData, participant_age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 29"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.participant_gender}
                    onChange={(e) => setFormData({ ...formData, participant_gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Date
                  </label>
                  <input
                    type="date"
                    value={formData.interview_date}
                    onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context / Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional context about the interview setting, participant background, etc."
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
                  disabled={loading}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Interview'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success Message */}
        {currentInterview && !selectedInterviewId && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  ✅ Interview Created Successfully!
                </h3>
                <p className="text-green-700">
                  Interview with {currentInterview.participant_name} has been created. 
                  Now add their decision-making stories below.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-700">
              <ArrowDown className="h-4 w-4 mr-2 animate-bounce" />
              <span className="text-sm font-medium">Scroll down to add stories</span>
            </div>
          </div>
        )}

        {/* Existing Interviews List */}
        {!isFormOpen && !currentInterview && interviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Interviews</h2>
            <div className="space-y-4">
              {interviews.map((interview) => {
                const stats = getInterviewStats(interview.id);
                
                return (
                  <div
                    key={interview.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectExistingInterview(interview)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {interview.participant_name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {stats.isComplete ? (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Complete</span>
                                </div>
                              ) : stats.hasStories ? (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>In Progress</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                  <BookOpen className="h-3 w-3" />
                                  <span>Needs Stories</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            {interview.participant_age && (
                              <span>{interview.participant_age} years old</span>
                            )}
                            {interview.participant_gender && (
                              <span>{interview.participant_gender}</span>
                            )}
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(interview.interview_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span>{stats.storyCount} stories</span>
                            <span>{stats.forceCount} forces</span>
                            <span>{stats.completeStories} complete</span>
                          </div>
                          {interview.context && (
                            <p className="text-gray-700 text-sm">{interview.context}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Click to add stories →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Stories Section */}
        {currentInterview && (
          <div ref={storiesSectionRef} className="scroll-mt-6">
            <StoriesManager
              interviewId={currentInterview.id}
              participantName={currentInterview.participant_name}
              projectId={projectId!}
            />
          </div>
        )}

        {/* Empty State */}
        {!loading && interviews.length === 0 && !isFormOpen && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No interviews yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start your research by creating your first participant interview.
            </p>
            <div className="mt-6">
              <button
                onClick={handleNewInterviewClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Interview
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </Layout>
  );
}