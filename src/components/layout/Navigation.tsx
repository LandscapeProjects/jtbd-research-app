import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Layers, 
  Grid3X3, 
  BarChart3,
  CheckCircle 
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: number;
  disabled?: boolean;
  description?: string;
}

interface NavigationProps {
  projectId?: string;
}

export function Navigation({ projectId }: NavigationProps) {
  const location = useLocation();

  const mainNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
  ];

  const projectNavigation: NavigationItem[] = projectId ? [
    { 
      name: 'Overview', 
      href: `/project/${projectId}`, 
      icon: Home,
      description: 'Project summary and workflow'
    },
    { 
      name: 'Interviews & Stories', 
      href: `/project/${projectId}/interviews`, 
      icon: Users, 
      phase: 1,
      description: 'Integrated interview and story capture'
    },
    { 
      name: 'Force Grouping', 
      href: `/project/${projectId}/grouping`, 
      icon: Layers, 
      phase: 2,
      description: 'Group similar forces thematically'
    },
    { 
      name: 'Matrix Validation', 
      href: `/project/${projectId}/matrix`, 
      icon: Grid3X3, 
      phase: 3,
      description: 'Validate story-group relationships'
    },
    { 
      name: 'Results', 
      href: `/project/${projectId}/results`, 
      icon: BarChart3, 
      phase: 4,
      description: 'Analysis and insights'
    },
  ] : [];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const NavigationSection = ({ items, title }: { items: NavigationItem[]; title?: string }) => (
    <div className="space-y-1">
      {title && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={clsx(
              'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive(item.href)
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={item.description}
          >
            <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{item.name}</span>
            {item.phase && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Phase {item.phase}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="bg-white border-r border-gray-200 w-64 flex-shrink-0">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex-1 px-3 space-y-6">
            <NavigationSection items={mainNavigation} />
            {projectNavigation.length > 0 && (
              <NavigationSection items={projectNavigation} title="Research Workflow" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}