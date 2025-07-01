import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Users, Calendar, User } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useProjectStore } from '../store/projectStore';

export function Interviews() {
  const { projectId } = useParams<{ projectId: string }>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_age: '',
    participant_gender: '',
    interview_date: new Date().toISOString().split('T')[0],
    context: '',
  });

  const { 
    currentProject, 
    interviews, 
    fetchInterviews, 
    createInterview,
    loading 
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchInterviews(projectId);
    }
  }, [projectId, fetchInterviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      await createInterview({
        project_id: projectId,
        participant_name: formData.participant_name,
        participant_age: formData.participant_age ? parseInt(formData.participant_age) : null,
        participant_gender: formData.participant_gender || null,
        interview_date: formData.interview_date,
        context: formData.context,
      });

      setFormData({
        participant_name: '',
        participant_age: '',
        participant_gender: '',
        interview_date: new Date().toISOString().split('T')[0],
        context: '',
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating interview:', error);
    }
  };

  return (
    <Layout projectId={projectId}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
            <p className="text-gray-600 mt-1">
              Manage participant interviews for {currentProject?.name}
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Interview
          </button>
        </div>

        {/* Create Interview Form */}
        {isFormOpen && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Interview</h2>
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
                    placeholder="e.g., María González"
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
                    placeholder="e.g., 34"
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
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Add Interview
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Interviews List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : interviews.length > 0 ? (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {interview.participant_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
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
                      {interview.context && (
                        <p className="text-gray-700 mt-2">{interview.context}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by adding your first participant interview.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}