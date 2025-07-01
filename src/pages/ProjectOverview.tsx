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
  AlertCircle
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useProjectStore } from '../store/projectStore';

const phases = [
  {
    id: 1,
    name: 'Data Collection',
    description: 'Conduct interviews and capture stories with forces',
    icon: Users,
    color: 'blue',
    paths: ['interviews', 'stories'],
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
        return stories.length > 0 ? 'completed' : interviews.length > 0 ? 'in-progress' : 'pending';
      case 2:
        return forceGroups.length > 0 ? 'completed' : forces.length > 0 ? 'available' : 'pending';
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

  return (
    <Layout projectId={projectId}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
          {currentProject.description && (
            <p className="text-gray-600">{currentProject.description}</p>
          )}
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Interviews</p>
                <p className="text-2xl font-semibold text-gray-900">{interviews.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Stories</p>
                <p className="text-2xl font-semibold text-gray-900">{stories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Layers className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Forces</p>
                <p className="text-2xl font-semibold text-gray-900">{forces.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Grid3X3 className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Groups</p>
                <p className="text-2xl font-semibold text-gray-900">{forceGroups.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Research Phases */}
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
                                {path}
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
      </div>
    </Layout>
  );
}