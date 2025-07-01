import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle,
  User,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  BarChart3,
  Grid3X3
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { GroupValidationQuestion } from '../components/matrix/GroupValidationQuestion';
import { useProjectStore } from '../store/projectStore';
import type { Story, ForceGroup, MatrixEntry } from '../lib/database.types';

export function MatrixValidation() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, boolean | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    currentProject,
    stories,
    forces,
    forceGroups,
    interviews,
    matrixEntries,
    fetchStories,
    fetchForces,
    fetchForceGroups,
    fetchInterviews,
    fetchMatrixEntries,
    createMatrixEntry,
    updateMatrixEntry,
    loading
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchStories(projectId);
      fetchForces(projectId);
      fetchForceGroups(projectId);
      fetchInterviews(projectId);
      fetchMatrixEntries(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    // Load existing responses for current story
    if (stories.length > 0 && forceGroups.length > 0) {
      loadResponsesForCurrentStory();
    }
  }, [currentStoryIndex, stories, forceGroups, matrixEntries]);

  const loadResponsesForCurrentStory = () => {
    if (!currentStory) return;

    const newResponses: Record<string, boolean | null> = {};
    
    // Get groups that have forces (exclude empty groups)
    const activeGroups = getActiveGroups();
    
    activeGroups.forEach(group => {
      const existingEntry = matrixEntries.find(
        entry => entry.story_id === currentStory.id && entry.group_id === group.id
      );
      newResponses[group.id] = existingEntry?.matches ?? null;
    });

    setResponses(newResponses);
  };

  const getActiveGroups = () => {
    return forceGroups.filter(group => {
      const groupForces = forces.filter(f => f.group_id === group.id);
      return groupForces.length > 0;
    });
  };

  const currentStory = stories[currentStoryIndex];
  const activeGroups = getActiveGroups();
  const pushGroups = activeGroups.filter(g => g.type === 'push');
  const pullGroups = activeGroups.filter(g => g.type === 'pull');

  const getStoryForces = (storyId: string, type: 'push' | 'pull' | 'habit' | 'anxiety') => {
    return forces.filter(f => f.story_id === storyId && f.type === type);
  };

  const getGroupForces = (groupId: string) => {
    return forces.filter(f => f.group_id === groupId);
  };

  const getInterviewInfo = (interviewId: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    return interview || null;
  };

  const handleResponseChange = async (groupId: string, response: boolean | null) => {
    setResponses(prev => ({ ...prev, [groupId]: response }));
    
    // Auto-save with debounce
    setAutoSaving(true);
    try {
      const existingEntry = matrixEntries.find(
        entry => entry.story_id === currentStory.id && entry.group_id === groupId
      );

      if (existingEntry) {
        await updateMatrixEntry(existingEntry.id, { matches: response });
      } else {
        await createMatrixEntry({
          story_id: currentStory.id,
          group_id: groupId,
          matches: response
        });
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving matrix entry:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const getStoryProgress = (storyIndex: number) => {
    const story = stories[storyIndex];
    if (!story) return { answered: 0, total: 0, percentage: 0 };

    const storyResponses = matrixEntries.filter(entry => entry.story_id === story.id);
    const answered = storyResponses.filter(entry => entry.matches !== null).length;
    const total = activeGroups.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percentage };
  };

  const getOverallProgress = () => {
    const totalQuestions = stories.length * activeGroups.length;
    const answeredQuestions = matrixEntries.filter(entry => entry.matches !== null).length;
    const percentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return { answered: answeredQuestions, total: totalQuestions, percentage };
  };

  const validateCurrentStory = () => {
    const errors: string[] = [];
    const currentProgress = getStoryProgress(currentStoryIndex);
    
    if (currentProgress.percentage < 80) {
      errors.push(`Please answer at least 80% of questions (currently ${currentProgress.percentage}%)`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setValidationErrors([]);
    }
  };

  const handleNext = () => {
    if (validateCurrentStory() && currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setValidationErrors([]);
    }
  };

  const handleStorySelect = (index: number) => {
    setCurrentStoryIndex(index);
    setValidationErrors([]);
  };

  const handleComplete = () => {
    const overallProgress = getOverallProgress();
    if (overallProgress.percentage >= 90) {
      navigate(`/project/${projectId}/results`);
    } else {
      setValidationErrors([
        `Please complete at least 90% of all validations (currently ${overallProgress.percentage}%)`
      ]);
    }
  };

  const currentProgress = getStoryProgress(currentStoryIndex);
  const overallProgress = getOverallProgress();

  if (loading || !currentStory) {
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

  if (stories.length === 0) {
    return (
      <Layout projectId={projectId}>
        <div className="p-6">
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stories available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please add stories before proceeding with matrix validation.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (activeGroups.length === 0) {
    return (
      <Layout projectId={projectId}>
        <div className="p-6">
          <div className="text-center py-12">
            <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No force groups available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please complete force grouping before proceeding with matrix validation.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const interview = getInterviewInfo(currentStory.interview_id);

  return (
    <Layout projectId={projectId}>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Matrix Validation</h1>
              <p className="text-gray-600 mt-1">
                Validate each story against force groups to build the clustering matrix
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

          {/* Overall Progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Overall Progress</h3>
              <span className="text-lg font-bold text-blue-600">{overallProgress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{overallProgress.answered} of {overallProgress.total} questions answered</span>
              <span>{stories.filter((_, i) => getStoryProgress(i).percentage >= 80).length} of {stories.length} stories complete</span>
            </div>
          </div>
        </div>

        {/* Story Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Story {currentStoryIndex + 1} of {stories.length}
            </h2>
            <div className="flex items-center space-x-2">
              <select
                value={currentStoryIndex}
                onChange={(e) => handleStorySelect(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stories.map((story, index) => {
                  const progress = getStoryProgress(index);
                  return (
                    <option key={story.id} value={index}>
                      Story {index + 1}: {story.title} ({progress.percentage}%)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Current Story Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <h3 className="font-medium text-gray-900">{interview?.participant_name}</h3>
                  <p className="text-sm text-gray-600">
                    {interview?.participant_age && `${interview.participant_age} years old`}
                    {interview?.participant_age && interview?.participant_gender && ', '}
                    {interview?.participant_gender}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 mb-4">
                <BookOpen className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{currentStory.title}</h3>
                  <p className="text-sm text-gray-700">{currentStory.description}</p>
                </div>
              </div>

              {/* Story Forces Context */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Their Pushes ({getStoryForces(currentStory.id, 'push').length}):
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {getStoryForces(currentStory.id, 'push').slice(0, 3).map(force => (
                    <p key={force.id} className="text-sm text-gray-600">• {force.description}</p>
                  ))}
                  {getStoryForces(currentStory.id, 'push').length > 3 && (
                    <p className="text-sm text-gray-500">... and {getStoryForces(currentStory.id, 'push').length - 3} more</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <ArrowDown className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Their Pulls ({getStoryForces(currentStory.id, 'pull').length}):
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {getStoryForces(currentStory.id, 'pull').slice(0, 3).map(force => (
                    <p key={force.id} className="text-sm text-gray-600">• {force.description}</p>
                  ))}
                  {getStoryForces(currentStory.id, 'pull').length > 3 && (
                    <p className="text-sm text-gray-500">... and {getStoryForces(currentStory.id, 'pull').length - 3} more</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              {/* Situations */}
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 mb-2 flex items-center">
                    🅰️ Situation A (Current)
                  </h4>
                  <p className="text-sm text-gray-700">{currentStory.situation_a}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-700 mb-2 flex items-center">
                    🅱️ Situation B (Desired)
                  </h4>
                  <p className="text-sm text-gray-700">{currentStory.situation_b}</p>
                </div>
              </div>

              {/* Current Story Progress */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Story Progress</span>
                  <span className="text-sm font-bold text-gray-900">{currentProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentProgress.percentage >= 80 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${currentProgress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {currentProgress.answered} of {currentProgress.total} questions answered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Questions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Does this story match the following force groups?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Consider whether the participant's situation and forces align with each thematic group.
            </p>

            {/* Push Groups */}
            {pushGroups.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <ArrowUp className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Push Force Groups</h4>
                </div>
                <div className="space-y-4">
                  {pushGroups.map(group => (
                    <GroupValidationQuestion
                      key={group.id}
                      group={group}
                      groupForces={getGroupForces(group.id)}
                      currentResponse={responses[group.id]}
                      onResponseChange={handleResponseChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pull Groups */}
            {pullGroups.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <ArrowDown className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-900">Pull Force Groups</h4>
                </div>
                <div className="space-y-4">
                  {pullGroups.map(group => (
                    <GroupValidationQuestion
                      key={group.id}
                      group={group}
                      groupForces={getGroupForces(group.id)}
                      currentResponse={responses[group.id]}
                      onResponseChange={handleResponseChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Validation Required</h4>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStoryIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous Story</span>
          </button>

          <div className="flex items-center space-x-4">
            {currentStoryIndex === stories.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={overallProgress.percentage < 90}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Results</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentStoryIndex === stories.length - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next Story</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Completion Status */}
        {overallProgress.percentage === 100 && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Matrix Validation Complete!</h3>
                <p className="text-green-700">
                  All stories have been validated against force groups. You can now view the clustering results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}