import { useState, useEffect } from 'react';
import { learningService, ExplanationResult } from '../services/learning.service';

interface FeynmanExplanationProps {
  topic: string;
  conceptName?: string;
  questionId?: string;
  conceptId?: string;
  bloomLevel?: number;
  onComplete?: (result: ExplanationResult) => void;
  onSkip?: () => void;
}

// Evaluation score color classes
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-orange-600';
};

const getScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-orange-50 border-orange-200';
};

// Bloom level prompts
const getExplanationPrompt = (topic: string, bloomLevel: number): string => {
  switch (bloomLevel) {
    case 1:
      return `What is ${topic}? Describe the basic definition in your own words.`;
    case 2:
      return `Explain ${topic} as if you're teaching a friend who has never seen it before.`;
    case 3:
      return `How would you use ${topic} to solve a problem? Walk through an example.`;
    case 4:
      return `Compare ${topic} with related concepts. What patterns do you see?`;
    case 5:
      return `When is ${topic} the best approach? What are its strengths and weaknesses?`;
    case 6:
      return `Create a real-world scenario that uses ${topic}. Explain your design.`;
    default:
      return `Explain ${topic} in your own words, as if teaching a classmate.`;
  }
};

export const FeynmanExplanation: React.FC<FeynmanExplanationProps> = ({
  topic,
  conceptName,
  questionId,
  conceptId,
  bloomLevel = 2,
  onComplete,
  onSkip,
}) => {
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [iteration, setIteration] = useState(1);
  const [showRefinement, setShowRefinement] = useState(false);

  const displayName = conceptName || topic;
  const prompt = getExplanationPrompt(displayName, bloomLevel);

  // Reset when topic changes
  useEffect(() => {
    setExplanation('');
    setResult(null);
    setIteration(1);
    setShowRefinement(false);
  }, [topic]);

  const handleSubmit = async () => {
    if (!explanation.trim()) return;

    setIsSubmitting(true);
    try {
      const evaluationResult = await learningService.processExplanation(
        topic,
        explanation,
        conceptId,
        questionId
      );
      setResult(evaluationResult);
      
      // Check if refinement is needed
      if (evaluationResult.shouldRefine && iteration < 3) {
        setShowRefinement(true);
      } else {
        onComplete?.(evaluationResult);
      }
    } catch (error) {
      console.error('Failed to evaluate explanation:', error);
      // Still show a basic result on error
      setResult({
        evaluation: {
          clarity: 50,
          completeness: 50,
          accuracy: 50,
          feedback: 'Unable to evaluate right now. Keep practicing!',
          bloomLevel: bloomLevel,
        },
        shouldRefine: false,
        refinementPrompts: [],
        bloomLevelDemonstrated: bloomLevel,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefine = () => {
    setShowRefinement(false);
    setIteration((prev) => prev + 1);
    // Keep the explanation for editing
  };

  const handleAccept = () => {
    if (result) {
      onComplete?.(result);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            🎓 Explain It!
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Attempt {iteration}/3
            </span>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Skip →
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          The best way to learn is to teach. Explain this concept in simple terms.
        </p>
      </div>

      {/* Prompt */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800 font-medium">{prompt}</p>
      </div>

      {/* Explanation Input */}
      {!result && (
        <div className="mb-4">
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Type your explanation here... Use simple words, give examples, and imagine you're teaching a friend."
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {explanation.length} characters
            </span>
            <button
              onClick={handleSubmit}
              disabled={!explanation.trim() || isSubmitting}
              className="btn-primary px-6 py-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Evaluating...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Evaluation Result */}
      {result && (
        <div className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg border ${getScoreBg(result.evaluation.clarity)}`}>
              <div className="text-xs text-gray-600 mb-1">Clarity</div>
              <div className={`text-2xl font-bold ${getScoreColor(result.evaluation.clarity)}`}>
                {result.evaluation.clarity}%
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBg(result.evaluation.completeness)}`}>
              <div className="text-xs text-gray-600 mb-1">Completeness</div>
              <div className={`text-2xl font-bold ${getScoreColor(result.evaluation.completeness)}`}>
                {result.evaluation.completeness}%
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBg(result.evaluation.accuracy)}`}>
              <div className="text-xs text-gray-600 mb-1">Accuracy</div>
              <div className={`text-2xl font-bold ${getScoreColor(result.evaluation.accuracy)}`}>
                {result.evaluation.accuracy}%
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Feedback</h4>
            <p className="text-sm text-gray-700">{result.evaluation.feedback}</p>
          </div>

          {/* Bloom Level */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Understanding Level:</span>
            <span className="font-medium text-primary-600">
              {learningService.getBloomLevelName(result.bloomLevelDemonstrated)}
            </span>
          </div>

          {/* Refinement Section */}
          {showRefinement && result.refinementPrompts.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                💡 Want to improve?
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                {result.refinementPrompts.map((prompt, idx) => (
                  <li key={idx}>• {prompt}</li>
                ))}
              </ul>
              <div className="flex space-x-2">
                <button
                  onClick={handleRefine}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                >
                  Refine Explanation
                </button>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          )}

          {/* Continue Button (when not showing refinement) */}
          {!showRefinement && (
            <div className="flex justify-end">
              <button
                onClick={handleAccept}
                className="btn-primary px-6 py-2"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Show explanation for reference during refinement */}
          {showRefinement && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Your Explanation:</h4>
              <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700">
                {explanation}
              </div>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Edit your explanation..."
                className="w-full h-32 p-3 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setShowRefinement(false);
                  }}
                  className="btn-primary px-6 py-2"
                >
                  Submit Refined Explanation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips (shown before submission) */}
      {!result && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Tips for a great explanation:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use simple words (avoid jargon)</li>
            <li>• Give a real-world example or analogy</li>
            <li>• Explain WHY, not just WHAT</li>
            <li>• Imagine teaching a younger student</li>
          </ul>
        </div>
      )}
    </div>
  );
};

