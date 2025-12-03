import { useEffect, useState } from 'react';
import { Question } from '../types';
import { GraphRenderer } from './GraphRenderer';
import { MathMarkdown } from './MathMarkdown';

interface QuestionPanelProps {
  question: Question;
  onAnswerSubmit: (selectedAnswer: string) => void;
  loading: boolean;
  answerResult?: {
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  onAnswerSubmit,
  loading,
  answerResult,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Reset selections whenever the question changes
    setSelectedAnswer('');
    setSubmitted(false);
  }, [question._id]);

  const handleSubmit = () => {
    if (!selectedAnswer || submitted) return;

    setSubmitted(true);
    onAnswerSubmit(selectedAnswer);
  };

  return (
    <div className="card h-full flex flex-col min-h-0">
      {/* Question Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
            {question.subject}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {question.difficulty}
          </span>
          {question.tags.length > 0 && (
            <>
              {question.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-auto">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Question:</h3>
          <div className="text-gray-700 leading-relaxed">
            <MathMarkdown content={question.content.questionText} />
          </div>
        </div>

        {/* Graph Display */}
        {question.content.graph && (
          <GraphRenderer graphData={question.content.graph} />
        )}

        {/* Answer Options */}
        <div className="space-y-3">
          {question.content.options.map((option, index) => {
            const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedAnswer === option;

            let optionClass = 'border-gray-300 hover:border-primary-400 hover:bg-primary-50';

            if (submitted) {
              optionClass = 'border-gray-300 bg-gray-50 opacity-60';
            } else if (isSelected) {
              optionClass = 'border-primary-500 bg-primary-50';
            }

            return (
              <button
                key={index}
                onClick={() => !submitted && setSelectedAnswer(option)}
                disabled={submitted}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${optionClass}`}
              >
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 mr-3">{optionLabel}.</span>
                  <span className="text-gray-700">
                    <MathMarkdown content={option} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submitted Message */}
        {submitted && answerResult && (
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
            <p className="font-semibold text-blue-800">
              {answerResult.isCorrect ? 'Great job! You selected the correct answer.' : 'Not quite. Review the explanation below and try the next question!'}
            </p>
            <p className="text-sm text-blue-900">
              Correct Answer: <span className="font-semibold">{answerResult.correctAnswer}</span>
            </p>
            {answerResult.explanation && (
              <div className="text-sm text-blue-900">
                <span className="font-medium">Explanation: </span>
                <MathMarkdown content={answerResult.explanation} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || loading || submitted}
          className="btn-primary w-full"
        >
          {submitted ? 'Submitted' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
};

