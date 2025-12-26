import { useState } from 'react';

interface GenerationParams {
  subject: 'math' | 'reading' | 'writing';
  difficulty?: 'easy' | 'medium' | 'hard';
  count: number;
  topic?: string;
  includeGraph?: boolean;
}

interface QuestionGenerationFormProps {
  onGenerate: (params: GenerationParams) => Promise<void>;
  isLoading: boolean;
}

export const QuestionGenerationForm: React.FC<QuestionGenerationFormProps> = ({
  onGenerate,
  isLoading,
}) => {
  const [subject, setSubject] = useState<'math' | 'reading' | 'writing'>('math');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('');
  const [count, setCount] = useState<number>(10);
  const [topic, setTopic] = useState<string>('');
  const [includeGraph, setIncludeGraph] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onGenerate({
      subject,
      difficulty: difficulty || undefined,
      count,
      topic: topic.trim() || undefined,
      includeGraph: subject === 'math' ? includeGraph : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Questions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value as 'math' | 'reading' | 'writing');
              if (e.target.value !== 'math') {
                setIncludeGraph(false);
              }
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="math">Math</option>
            <option value="reading">Reading</option>
            <option value="writing">Writing</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty <span className="text-gray-400">(optional)</span>
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | '')}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            min={1}
            max={50}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">Between 1 and 50 questions</p>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., quadratic equations, main idea"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Graph Option - Only for Math */}
      {subject === 'math' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeGraph}
              onChange={(e) => setIncludeGraph(e.target.checked)}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              disabled={isLoading}
            />
            <span className="ml-3">
              <span className="font-medium text-gray-900">Include Graph Data</span>
              <span className="block text-sm text-gray-600">
                Generate questions that include visual graph/chart data for verification
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Questions...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate {count} Question{count > 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </form>
  );
};


