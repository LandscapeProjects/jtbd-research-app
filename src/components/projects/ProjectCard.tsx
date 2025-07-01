import React from 'react';
import { Calendar, Users, BookOpen, BarChart3, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '../../lib/database.types';

interface ProjectCardProps {
  project: Project;
  stats?: {
    interviews: number;
    stories: number;
    progress: number;
  };
}

export function ProjectCard({ project, stats }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // PURE DYNAMIC: Get creator name with clean fallback logic
  const getCreatorName = () => {
    if (project.profiles?.full_name) {
      return project.profiles.full_name;
    }
    
    if (project.profiles?.email) {
      return project.profiles.email.split('@')[0];
    }
    
    return 'Usuario'; // Only fallback - no hardcoded names
  };

  return (
    <Link
      to={`/project/${project.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
            {project.description && (
              <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
        </div>

        {/* Creator Info - Pure Dynamic */}
        <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>Created by: {getCreatorName()}</span>
          {!project.profiles && (
            <span className="text-xs text-amber-600 font-medium">(Profile not found)</span>
          )}
        </div>

        {stats && (
          <div className="flex items-center space-x-6 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-1.5" />
              <span>{stats.interviews} interviews</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="h-4 w-4 mr-1.5" />
              <span>{stats.stories} stories</span>
            </div>
          </div>
        )}

        {stats && stats.progress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(stats.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Created {formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center">
            <BarChart3 className="h-3 w-3 mr-1" />
            <span>View Details</span>
          </div>
        </div>
      </div>
    </Link>
  );
}