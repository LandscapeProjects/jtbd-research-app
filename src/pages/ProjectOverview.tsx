import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  Layers, 
  Grid3X3, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  TrendingUp
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useProjectStore } from '../store/projectStore';

const phases = [
  {
    id: 1,
    name: 'Interviews & Stories',
    description: 'Conduct interviews and capture participant stories with forces',
    icon: Users,
    color: 'blue',
    paths: ['interviews'],
  },
  {
    id: 2,
    name: 'Force Grouping',
    description: 'Group similar forces using drag & drop interface',
    icon: Layers,
    color: 'green',
    paths: ['grouping'],
  },
  {
    id: 3,
    name: 'Matrix Validation',
    description: 'Validate story-group matches systematically',
    icon: Grid3X3,
    color: 'purple',
    paths: ['matrix'],
  },
  {
    id: 4,
    name: 'Analysis & Results',
    description: 'View clustering results and export insights',
    icon: BarChart3,
    color: 'orange',
    paths: ['results'],
  },
];

export function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { 
    currentProject, 
    projects, 
    setCurrentProject,
    fetchInterviews,
    fetchStories,
    fetchForces,
    fetchForceGroups,
    interviews,
    stories,
    forces,
    forceGroups
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
      }
      
      // Fetch project data
      fetchInterviews(projectId);
      fetchStories(projectId);
      fetchForces(projectId);
      fetchForceGroups(projectId);
    }
  }, [projectId, projects, setCurrentProject, fetchInterviews, fetchStories, fetchForces, fetchForceGroups]);

  if (!currentProject) {
    return (
      <Layout projectId={projectId}>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getPhaseStatus = (phaseId: number) => {
    switch (phaseId) {
      case 1:
        // Check if interviews have stories with forces
        const completeInterviews = interviews.filter(interview => {
          const interviewStories = stories.filter(s => s.interview_id === interview.id);
          if (interviewStories.length === 0) return false;
          
          return interviewStories.every(story => {
            const pushes = forces.filter(f => f.story_id === story.id && f.type === 'push');
            const pulls = forces.filter(f => f.story_id === story.id && f.type === 'pull');
            return pushes.length > 0 && pulls.length > 0;
          });
        });
        
        if (completeInterviews.length > 0) return 'completed';
        if (stories.length > 0) return 'in-progress';
        if (interviews.length > 0) return 'in-progress';
        return 'pending';
        
      case 2:
        const groupedForces = forces.filter(f => f.group_id);
        if (groupedForces.length === forces.length && forces.length > 0) return 'completed';
        if (groupedForces.length > 0) return 'in-progress';
        return forces.length > 0 ? 'available' : 'pending';
        
      case 3:
        return forceGroups.length > 0 ? 'available' : 'pending';
        
      case 4:
        return 'available'; // Always available for viewing
        
      default:
        return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'available':
        return <ArrowRight className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'available':
        return 'border-gray-200 bg-white hover:bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50 opacity-60';
    }
  };

  // Calculate completion metrics
  const totalInterviews = interviews.length;
  const interviewsWithStories = interviews.filter(i => 
    stories.some(s => s.interview_id === i.id)
  ).length;
  
  const completeStories = stories.filter(story => {
    const pushes = forces.filter(f => f.story_id === story.id && f.type === 'push');
    const pulls = forces.filter(f => f.story_id === story.id && f.type === 'pull');
    return pushes.length > 0 && pulls.length > 0;
  }).length;

  const groupedForces = forces.filter(f => f.group_id).length;

  return (
    <Layout projectId={projectId}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
          {currentProject.description && (
            <p className="text-gray-600 mb-3">{currentProject.description}</p>
          )}
          
          {/* Project Creator Info */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 inline-flex">
            <User className="h-4 w-4" />
            <span>Created by: {currentProject.profiles?.full_name || 'User'}</span>
          </div>
        </div>

        {/* Enhanced Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Interviews</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalInterviews}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">With Stories</p>
                <p className="text-sm font-medium text-blue-600">{interviewsWithStories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Stories</p>
                  <p className="text-2xl font-semibold text-gray-900">{stories.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Complete</p>
                <p className="text-sm font-medium text-green-600">{completeStories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Layers className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Forces</p>
                  <p className="text-2xl font-semibold text-gray-900">{forces.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Grouped</p>
                <p className="text-sm font-medium text-purple-600">{groupedForces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Progress</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round((completeStories / Math.max(stories.length, 1)) * 100)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Groups</p>
                <p className="text-sm font-medium text-orange-600">{forceGroups.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Research Workflow */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Research Workflow</h2>
            <p className="text-gray-600 mt-1">Follow these phases to complete your JTBD analysis</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {phases.map((phase) => {
                const Icon = phase.icon;
                const status = getPhaseStatus(phase.id);
                const isClickable = status !== 'pending';

                return (
                  <div
                    key={phase.id}
                    className={`border rounded-lg p-6 transition-all ${getStatusColor(status)} ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${phase.color}-100`}>
                          <Icon className={`h-6 w-6 text-${phase.color}-600`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Phase {phase.id}: {phase.name}
                          </h3>
                          <p className="text-gray-600 text-sm">{phase.description}</p>
                          {phase.id === 1 && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              ✨ New integrated workflow - capture interviews and stories together!
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(status)}
                        {isClickable && (
                          <div className="flex space-x-2">
                            {phase.paths.map((path) => (
                              <Link
                                key={path}
                                to={`/project/${projectId}/${path}`}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors capitalize"
                              >
                                {path === 'interviews' ? 'Start Here' : path}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {totalInterviews === 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Ready to Start?</h3>
                <p className="text-blue-700 mb-4">
                  Begin your research by creating your first interview. The new integrated workflow 
                  lets you capture stories and forces all in one place!
                </p>
                <Link
                  to={`/project/${projectId}/interviews`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create First Interview
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}