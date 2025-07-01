import React, { useEffect, useState } from 'react';
import { Plus, Search, BarChart3, Users, BookOpen, RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ProjectCard } from '../components/projects/ProjectCard';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { useProjectStore } from '../store/projectStore';

export function Dashboard() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { projects, loading, isFetching, fetchProjects, refreshProfiles } = useProjectStore();

  // FIX: Add debouncing and cleanup to prevent rapid successive calls
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setError(null);
        console.log('📊 Dashboard requesting projects...');
        
        // Small delay to prevent rapid successive calls
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchProjects();
      } catch (err: any) {
        console.error('Dashboard failed to load projects:', err);
        setError(err.message || 'Failed to load projects');
      }
    };
    
    loadProjects();

    // Cleanup function when component unmounts
    return () => {
      console.log('📊 Dashboard unmounting - cleanup any pending operations');
    };
  }, []); // Keep empty dependency array to prevent infinite loop

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectCreated = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual pure dynamic refresh...');
    try {
      // Force reset any stuck states
      setTimeout(async () => {
        console.log('🔄 Attempting fresh fetchProjects...');
        await fetchProjects();
        setError(null);
      }, 300);
    } catch (err: any) {
      console.error('Manual refresh failed:', err);
      setError(err.message);
    }
  };

  const handleRefreshProfiles = async () => {
    console.log('👤 Refreshing profiles only...');
    try {
      await refreshProfiles();
    } catch (err: any) {
      console.error('Profile refresh failed:', err);
    }
  };

  // Error boundary for failed project loading
  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Projects</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={handleManualRefresh}
                disabled={loading || isFetching}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 inline mr-2 ${(loading || isFetching) ? 'animate-spin' : ''}`} />
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Research Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage your Jobs To Be Done research projects
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </button>
          </div>

          {/* Pure Dynamic Data Status Panel */}
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <div className="text-sm text-green-800 mb-2">
              <p><strong>Pure Dynamic Data Status:</strong></p>
              <p>Projects: {projects.length} | Loading: {loading ? 'YES' : 'NO'} | Fetching: {isFetching ? 'YES' : 'NO'}</p>
              <p>
                Profiles Found: {projects.filter(p => p.profiles?.full_name).length} | 
                Missing: {projects.filter(p => !p.profiles?.full_name).length}
              </p>
              <p>Last Update: {new Date().toLocaleTimeString()}</p>
            </div>
            
            <div className="space-x-2">
              <button 
                onClick={handleManualRefresh}
                disabled={loading || isFetching}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50 hover:bg-green-700"
              >
                <RefreshCw className={`h-3 w-3 inline mr-1 ${(loading || isFetching) ? 'animate-spin' : ''}`} />
                {(loading || isFetching) ? 'Loading...' : '🔄 Refresh All'}
              </button>
              
              <button 
                onClick={handleRefreshProfiles}
                disabled={loading || isFetching}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700"
              >
                <User className="h-3 w-3 inline mr-1" />
                👤 Refresh Profiles
              </button>
            </div>
            
            {/* Show missing profiles for debugging */}
            {projects.some(p => !p.profiles?.full_name) && (
              <div className="mt-2 text-xs text-red-600">
                Missing profiles for: {projects
                  .filter(p => !p.profiles?.full_name)
                  .map(p => p.owner_id.slice(0,8))
                  .join(', ')}...
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Projects</p>
                  <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Projects</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {projects.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {loading || isFetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isFetching ? 'Loading pure dynamic data...' : 'Processing...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Check console for debug logs (🔍 1-12)</p>
            </div>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={{
                  interviews: 0, // TODO: Add real stats
                  stories: 0,
                  progress: 25,
                }}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No projects match your search criteria.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first JTBD research project.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </Layout>
  );
}