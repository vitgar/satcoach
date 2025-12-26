import { useState, useMemo } from 'react';
import { Question } from '../types';
import { QuestionNavigation } from './QuestionNavigation';
import { GraphRenderer } from './GraphRenderer';
import { MathMarkdown } from './MathMarkdown';

type FilterType = 'all' | 'with-graphs' | 'without-graphs';

interface QuestionViewerProps {
  questions: Question[];
}

export const QuestionViewer: React.FC<QuestionViewerProps> = ({ questions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  // Apply filter to questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filter === 'with-graphs') {
        return q.content.graph !== undefined && q.content.graph !== null;
      }
      if (filter === 'without-graphs') {
        return !q.content.graph;
      }
      return true;
    });
  }, [questions, filter]);

  // Reset index when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  };

  // Navigation handlers
  const handleNavigate = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, filteredQuestions.length - 1)));
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1));
  };

  // Get current question
  const currentQuestion = filteredQuestions[currentIndex];

  // Count questions with graphs
  const graphCount = questions.filter((q) => q.content.graph).length;
  const noGraphCount = questions.length - graphCount;

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Questions Generated</h3>
        <p className="text-gray-500">Use the form above to generate questions</p>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value as FilterType)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Questions ({questions.length})</option>
                <option value="with-graphs">With Graphs ({graphCount})</option>
                <option value="without-graphs">Without Graphs ({noGraphCount})</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No questions match the current filter</p>
          <button
            onClick={() => handleFilterChange('all')}
            className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
          >
            Show all questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter and Stats Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value as FilterType)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Questions ({questions.length})</option>
              <option value="with-graphs">With Graphs ({graphCount})</option>
              <option value="without-graphs">Without Graphs ({noGraphCount})</option>
            </select>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {graphCount} with graphs
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {noGraphCount} without graphs
            </span>
          </div>
        </div>
      </div>

      {/* Question Display */}
      {currentQuestion && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Question Header */}
          <div className="flex items-center flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
              {currentQuestion.subject}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
              {currentQuestion.difficulty}
            </span>
            {currentQuestion.content.graph && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Has Graph
              </span>
            )}
            {currentQuestion.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Question Content */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question:</h3>
            <div className="text-gray-700 leading-relaxed">
              <MathMarkdown content={currentQuestion.content.questionText} />
            </div>
          </div>

          {/* Graph Display */}
          {currentQuestion.content.graph && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">Graph Preview:</span>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                  Type: {currentQuestion.content.graph.type}
                </span>
              </div>
              <GraphRenderer graphData={currentQuestion.content.graph} />
            </div>
          )}

          {/* Answer Options */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Options:</h4>
            <div className="space-y-2">
              {currentQuestion.content.options.map((option, index) => {
                const optionLabel = String.fromCharCode(65 + index);
                const isCorrect = currentQuestion.content.correctAnswer === optionLabel;
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className={`font-semibold mr-3 ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                        {optionLabel}.
                      </span>
                      <span className={isCorrect ? 'text-green-700' : 'text-gray-700'}>
                        <MathMarkdown content={option} />
                      </span>
                      {isCorrect && (
                        <span className="ml-auto text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Explanation:</h4>
            <p className="text-blue-700 text-sm">
              <MathMarkdown content={currentQuestion.content.explanation} />
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <QuestionNavigation
        currentIndex={currentIndex}
        totalQuestions={filteredQuestions.length}
        onNavigate={handleNavigate}
        onPrevious={handlePrevious}
        onNext={handleNext}
        questionsPerPage={10}
      />
    </div>
  );
};


