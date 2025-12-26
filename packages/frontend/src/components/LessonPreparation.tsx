/**
 * LessonPreparation Component
 * 
 * Displays a loading animation while the AI selects the optimal topic
 * and prepares the personalized lesson for the student.
 */

import { useState, useEffect } from 'react';

interface LessonPreparationProps {
  subject: string;
  onComplete?: () => void;
}

const PREPARATION_MESSAGES = [
  { text: 'Analyzing your learning history...', icon: '📊' },
  { text: 'Identifying concepts for review...', icon: '🔍' },
  { text: 'Calculating optimal challenge level...', icon: '🎯' },
  { text: 'Selecting the perfect topic for you...', icon: '✨' },
  { text: 'Preparing your personalized lesson...', icon: '📚' },
];

export const LessonPreparation = ({ subject, onComplete }: LessonPreparationProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Rotate through messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PREPARATION_MESSAGES.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  // Animate progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onComplete?.();
          return 100;
        }
        return prev + 0.5;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  const currentMessage = PREPARATION_MESSAGES[messageIndex];
  
  // Calculate stroke dashoffset for circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -z-10" />
      
      {/* Main content card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center border border-gray-100">
        {/* Circular Progress */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-100 ease-linear"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
              {currentMessage.icon}
            </span>
          </div>
        </div>

        {/* Subject badge */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse" />
          {subject}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Preparing Your Lesson
        </h2>

        {/* Dynamic message */}
        <p className="text-gray-600 mb-6 h-6 transition-opacity duration-300">
          {currentMessage.text}
        </p>

        {/* Progress percentage */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-500 w-12">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Decorative elements */}
        <div className="mt-8 flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-300"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom text */}
      <p className="mt-6 text-sm text-gray-500 text-center max-w-sm">
        Our AI is analyzing your progress to create the perfect learning experience tailored just for you.
      </p>
    </div>
  );
};

export default LessonPreparation;

