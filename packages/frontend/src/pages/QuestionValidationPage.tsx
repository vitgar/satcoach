import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import api from '../services/api';

interface Question {
  _id: string;
  subject: string;
  difficulty: string;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  tags: string[];
}

interface ValidationResult {
  questionId: string;
  isAnswerCorrect: boolean;
  suggestedAnswer?: string;
  improvedExplanation: string;
  reasoning: string;
  accepted?: boolean;
  grammarIssues?: string[];
  wordingSuggestions?: string[];
  satFormatAlignment?: {
    aligned: boolean;
    issues: string[];
    suggestions: string[];
  };
  complexityAssessment?: {
    level: 'too-easy' | 'appropriate' | 'too-hard';
    reasoning: string;
    suggestions?: string;
  };
  overallQuality?: {
    score: number;
    feedback: string;
  };
}

interface Stats {
  totalQuestions: number;
  bySubject: Record<string, number>;
}

export const QuestionValidationPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [applying, setApplying] = useState(false);
  
  // Pagination state
  const [currentSkip, setCurrentSkip] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  // Ref for scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Scroll to results when validation completes
  useEffect(() => {
    if (validationResults.length > 0 && !validating && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [validationResults.length, validating]);

  const loadStats = async () => {
    try {
      const response = await api.get('/validation/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadQuestions = async (skip: number = 0) => {
    setLoading(true);
    try {
      const response = await api.get('/validation/questions', {
        params: {
          subject: selectedSubject,
          limit: 100,
          skip: skip,
        },
      });
      setQuestions(response.data.questions);
      setTotalQuestions(response.data.total);
      setCurrentSkip(skip);
      setValidationResults([]);
      setCurrentValidationIndex(0);
    } catch (error) {
      console.error('Failed to load questions:', error);
      alert('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateAllQuestions = async () => {
    if (questions.length === 0) {
      alert('Please load questions first');
      return;
    }

    setValidating(true);
    setValidationResults([]);
    setCurrentValidationIndex(0);

    const results: ValidationResult[] = [];

    for (let i = 0; i < questions.length; i++) {
      setCurrentValidationIndex(i + 1);
      
      try {
        const response = await api.post('/validation/validate-question', {
          questionId: questions[i]._id,
        });
        
        results.push({
          ...response.data,
          accepted: true, // Default to accepted
        });
      } catch (error) {
        console.error(`Failed to validate question ${questions[i]._id}:`, error);
        results.push({
          questionId: questions[i]._id,
          isAnswerCorrect: true,
          improvedExplanation: questions[i].content.explanation,
          reasoning: 'Validation failed',
          accepted: false,
        });
      }
    }

    setValidationResults(results);
    setValidating(false);
  };

  const toggleAcceptance = (index: number) => {
    const updated = [...validationResults];
    updated[index].accepted = !updated[index].accepted;
    setValidationResults(updated);
  };

  const acceptAll = () => {
    const updated = validationResults.map(r => ({ ...r, accepted: true }));
    setValidationResults(updated);
  };

  const rejectAll = () => {
    const updated = validationResults.map(r => ({ ...r, accepted: false }));
    setValidationResults(updated);
  };

  const applyChanges = async () => {
    const acceptedChanges = validationResults
      .filter(r => r.accepted)
      .map(r => ({
        questionId: r.questionId,
        newAnswer: r.isAnswerCorrect ? undefined : r.suggestedAnswer,
        newExplanation: r.improvedExplanation,
      }));

    if (acceptedChanges.length === 0) {
      alert('No changes to apply');
      return;
    }

    if (!confirm(`Apply ${acceptedChanges.length} changes to the database?`)) {
      return;
    }

    setApplying(true);
    try {
      const response = await api.post('/validation/apply-changes', {
        changes: acceptedChanges,
      });
      
      alert(`Successfully updated ${response.data.results.updated} questions!`);
      
      // Reload questions
      await loadQuestions();
      await loadStats();
    } catch (error) {
      console.error('Failed to apply changes:', error);
      alert('Failed to apply changes. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const getQuestionById = (questionId: string) => {
    return questions.find(q => q._id === questionId);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Question Validation System</h1>
          <p className="mt-2 text-gray-600">
            Validate SAT questions and improve explanations using AI
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Questions</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalQuestions}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Math</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.bySubject.math || 0}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Reading</h3>
              <p className="text-3xl font-bold text-green-600">{stats.bySubject.reading || 0}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Writing</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.bySubject.writing || 0}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="card mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Filter
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Subjects</option>
                <option value="math">Math</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
              </select>
            </div>

            <div className="flex-1"></div>

            {/* Pagination Controls */}
            {totalQuestions > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadQuestions(currentSkip - 100)}
                  disabled={currentSkip === 0 || loading || validating}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous 100
                </button>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {currentSkip + 1}-{Math.min(currentSkip + 100, totalQuestions)} of {totalQuestions}
                </span>
                <button
                  onClick={() => loadQuestions(currentSkip + 100)}
                  disabled={currentSkip + 100 >= totalQuestions || loading || validating}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next 100 →
                </button>
              </div>
            )}

            <button
              onClick={() => loadQuestions(0)}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Loading...' : 'Load 100 Questions'}
            </button>

            {questions.length > 0 && (
              <button
                onClick={validateAllQuestions}
                disabled={validating}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {validating ? `Validating ${currentValidationIndex}/${questions.length}...` : `Validate ${questions.length} Questions`}
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {validating && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(currentValidationIndex / questions.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Processing question {currentValidationIndex} of {questions.length}
              </p>
            </div>
          )}
        </div>

        {/* Results - scroll target */}
        <div ref={resultsRef} />
        {validationResults.length > 0 && (
          <>
            {/* Results Header */}
            <div className="card mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Validation Results ({validationResults.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {validationResults.filter(r => !r.isAnswerCorrect).length} incorrect answers found
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={rejectAll}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={applyChanges}
                    disabled={applying || validationResults.filter(r => r.accepted).length === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    {applying ? 'Applying...' : `Apply ${validationResults.filter(r => r.accepted).length} Changes`}
                  </button>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {validationResults.map((result, index) => {
                const question = getQuestionById(result.questionId);
                if (!question) return null;

                return (
                  <div
                    key={result.questionId}
                    className={`card ${result.accepted ? 'border-2 border-green-500' : 'border-2 border-gray-200'}`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            question.subject === 'math' ? 'bg-blue-100 text-blue-800' :
                            question.subject === 'reading' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {question.subject}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {question.difficulty}
                          </span>
                          {!result.isAnswerCorrect && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              ⚠️ Wrong Answer
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 font-medium line-clamp-2">
                          {question.content.questionText}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAcceptance(index)}
                        className={`ml-4 px-4 py-2 rounded-lg font-medium ${
                          result.accepted
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {result.accepted ? '✓ Accepted' : 'Rejected'}
                      </button>
                    </div>

                    {/* Answer Correction */}
                    {!result.isAnswerCorrect && result.suggestedAnswer && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-900 mb-1">
                          Answer Correction Needed
                        </p>
                        <p className="text-sm text-red-700">
                          Current: <span className="font-bold">{question.content.correctAnswer}</span> → 
                          Suggested: <span className="font-bold">{result.suggestedAnswer}</span>
                        </p>
                      </div>
                    )}

                    {/* Explanations Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Current Explanation
                        </h4>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                          {question.content.explanation}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Improved Explanation
                        </h4>
                        <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-700">
                          {result.improvedExplanation}
                        </div>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">AI Reasoning</p>
                      <p className="text-xs text-blue-700">{result.reasoning}</p>
                    </div>

                    {/* Grammar Issues */}
                    {result.grammarIssues && result.grammarIssues.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-medium text-yellow-900 mb-2">Grammar Issues</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                          {result.grammarIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Wording Suggestions */}
                    {result.wordingSuggestions && result.wordingSuggestions.length > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs font-medium text-purple-900 mb-2">Wording Suggestions</p>
                        <ul className="text-xs text-purple-700 list-disc list-inside space-y-1">
                          {result.wordingSuggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* SAT Format Alignment */}
                    {result.satFormatAlignment && (
                      <div className={`mt-4 p-3 border rounded-lg ${
                        result.satFormatAlignment.aligned 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}>
                        <p className={`text-xs font-medium mb-2 ${
                          result.satFormatAlignment.aligned ? 'text-green-900' : 'text-orange-900'
                        }`}>
                          SAT Format Alignment: {result.satFormatAlignment.aligned ? '✓ Aligned' : '⚠ Needs Improvement'}
                        </p>
                        {result.satFormatAlignment.issues.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-orange-900 mb-1">Issues:</p>
                            <ul className="text-xs text-orange-700 list-disc list-inside space-y-1">
                              {result.satFormatAlignment.issues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.satFormatAlignment.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-900 mb-1">Suggestions:</p>
                            <ul className="text-xs text-green-700 list-disc list-inside space-y-1">
                              {result.satFormatAlignment.suggestions.map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Complexity Assessment */}
                    {result.complexityAssessment && (
                      <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-xs font-medium text-indigo-900 mb-1">
                          Complexity Level: 
                          <span className={`ml-2 ${
                            result.complexityAssessment.level === 'too-easy' ? 'text-yellow-700' :
                            result.complexityAssessment.level === 'too-hard' ? 'text-red-700' :
                            'text-green-700'
                          }`}>
                            {result.complexityAssessment.level === 'too-easy' ? 'Too Easy' :
                             result.complexityAssessment.level === 'too-hard' ? 'Too Hard' :
                             'Appropriate'}
                          </span>
                        </p>
                        <p className="text-xs text-indigo-700 mt-1">{result.complexityAssessment.reasoning}</p>
                        {result.complexityAssessment.suggestions && (
                          <p className="text-xs text-indigo-600 mt-1 italic">
                            {result.complexityAssessment.suggestions}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Overall Quality */}
                    {result.overallQuality && (
                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-900">Overall Quality Score</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  result.overallQuality.score >= 8 ? 'bg-green-500' :
                                  result.overallQuality.score >= 6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${(result.overallQuality.score / 10) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-900">
                              {result.overallQuality.score}/10
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700">{result.overallQuality.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {questions.length === 0 && !loading && (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">No questions loaded yet</p>
            <p className="text-sm text-gray-400">
              Select a subject filter and click "Load 100 Questions" to begin
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

