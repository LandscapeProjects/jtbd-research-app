import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AuthForm } from './components/auth/AuthForm';
import { Dashboard } from './pages/Dashboard';
import { ProjectOverview } from './pages/ProjectOverview';
import { Interviews } from './pages/Interviews';
import { Stories } from './pages/Stories';
import { ForceGrouping } from './pages/ForceGrouping';
import { MatrixValidation } from './pages/MatrixValidation';

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectOverview />} />
        <Route path="/project/:projectId/interviews" element={<Interviews />} />
        <Route path="/project/:projectId/stories" element={<Stories />} />
        <Route path="/project/:projectId/grouping" element={<ForceGrouping />} />
        <Route path="/project/:projectId/matrix" element={<MatrixValidation />} />
        {/* TODO: Add results route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;