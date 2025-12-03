import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { progressService } from '../services/progress.service';
// import { sessionService } from '../services/session.service'; // TODO: Use when implementing session tracking
import { Analytics, ReviewSchedule } from '../types';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [analyticsData, scheduleData] = await Promise.all([
          progressService.getAnalytics(),
          progressService.getSchedule(),
        ]);
        setAnalytics(analyticsData);
        setSchedule(scheduleData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/study"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Studying
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

          <div className="card bg-primary-50">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your Level
            </h3>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-primary-600">
                {user?.learningProfile.currentLevel}
              </span>
              <span className="ml-2 text-gray-600">/10</span>
            </div>
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Attempts</h4>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.overall.totalAttempts}
              </p>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Average Accuracy</h4>
              <p className="text-3xl font-bold text-primary-600">
                {Math.round(analytics.overall.averageAccuracy * 100)}%
              </p>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Average Mastery</h4>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(analytics.overall.averageMastery * 100)}%
              </p>
            </div>
          </div>
        )}

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
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${data.accuracy * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Schedule */}
        {schedule && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Due Now</h4>
              <p className="text-3xl font-bold text-orange-600">
                {schedule.dueNow.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Topics ready to review</p>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Overdue</h4>
              <p className="text-3xl font-bold text-red-600">
                {schedule.overdue.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Topics need attention</p>
            </div>

            <div className="card">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Upcoming</h4>
              <p className="text-3xl font-bold text-blue-600">
                {schedule.upcoming.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Topics scheduled soon</p>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {analytics && (analytics.strengths.length > 0 || analytics.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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

