import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionViewer } from '../components/QuestionViewer';
import { Question } from '../types';
import { questionGenerationService, GenerationParams } from '../services/questionGeneration.service';

export const QuestionGenerationPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<GenerationParams | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to results when questions are generated
  useEffect(() => {
    if (questions.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [questions]);

  const handleGenerate = async (params: GenerationParams) => {
    setIsLoading(true);
    setError(null);
    setLastGenerationParams(params);

    try {
      const generatedQuestions = await questionGenerationService.generateQuestions(params);
      setQuestions(generatedQuestions);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate questions');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Generator</h1>
          <p className="text-gray-600">
            Generate SAT practice questions using AI. For Math questions, you can optionally include graph data for verification.
          </p>
        </div>

        {/* Generation Form */}
        <div className="mb-8">
          <QuestionGenerationForm onGenerate={handleGenerate} isLoading={isLoading} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium text-red-800">Generation Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generation Summary - scroll target */}
        <div ref={resultsRef} />
        {questions.length > 0 && lastGenerationParams && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">
                  Generated {questions.length} {lastGenerationParams.subject} question{questions.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                {lastGenerationParams.difficulty && (
                  <span className="px-2 py-1 bg-green-100 rounded">
                    {lastGenerationParams.difficulty}
                  </span>
                )}
                {lastGenerationParams.includeGraph && (
                  <span className="px-2 py-1 bg-green-100 rounded flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    With Graphs
                  </span>
                )}
                {lastGenerationParams.topic && (
                  <span className="px-2 py-1 bg-green-100 rounded">
                    Topic: {lastGenerationParams.topic}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Questions...</h3>
              <p className="text-gray-500 text-center">
                This may take a moment depending on the number of questions requested.
                <br />
                Each question is being crafted by AI to match SAT standards.
              </p>
            </div>
          </div>
        )}

        {/* Question Viewer */}
        {!isLoading && (
          <QuestionViewer questions={questions} />
        )}
      </div>
    </Layout>
  );
};






