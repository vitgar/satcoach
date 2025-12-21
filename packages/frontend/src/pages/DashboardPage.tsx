import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { progressService } from '../services/progress.service';
import { Analytics } from '../types';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const analyticsData = await progressService.getAnalytics();
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleGuidedReviewClick = () => {
    navigate('/guided-review');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Ready to continue your SAT preparation journey?
          </p>
        </div>

        {/* Main Action Cards - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Start Practicing Card */}
          <Link
            to="/study"
            className="card hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Practicing
                </h3>
                <p className="text-gray-600">
                  Continue with personalized questions
                </p>
              </div>
              <div className="text-primary-600">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Guided Review Card */}
          <button
            onClick={handleGuidedReviewClick}
            className="card hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Guided Review
                </h3>
                <p className="text-gray-600">
                  Get personalized topic guidance with AI tutor
                </p>
              </div>
              <div className="text-emerald-600">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Subject Performance */}
        {analytics && Object.keys(analytics.bySubject).length > 0 && (
          <div className="card mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Subject Performance
            </h3>
            <div className="space-y-4">
              {Object.entries(analytics.bySubject).map(([subject, data]) => (
                <div key={subject}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {subject}
                    </span>
                    <span className="text-sm text-gray-600">
                      {Math.round(data.accuracy * 100)}% ({data.attempts} attempts)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${data.accuracy * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Subject Performance */}
        {analytics && Object.keys(analytics.bySubject).length === 0 && (
          <div className="card mb-8 text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No practice data yet</h3>
            <p className="text-gray-500 mb-4">Start practicing to see your subject performance</p>
            <Link
              to="/study"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Practicing
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {analytics && (analytics.strengths.length > 0 || analytics.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.strengths.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Your Strengths
                </h3>
                <ul className="space-y-2">
                  {analytics.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analytics.weaknesses.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-orange-500 mr-2">!</span>
                  Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {analytics.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      • {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
