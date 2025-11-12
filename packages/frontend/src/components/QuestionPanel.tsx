import { useState } from 'react';
import { Question } from '../types';

interface QuestionPanelProps {
  question: Question;
  onAnswerSubmit: (selectedAnswer: string) => void;
  loading: boolean;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  onAnswerSubmit,
  loading,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedAnswer || submitted) return;

    setSubmitted(true);
    onAnswerSubmit(selectedAnswer);
  };

  const handleNextQuestion = () => {
    setSelectedAnswer('');
    setSubmitted(false);
  };

  return (
    <div className="card h-full flex flex-col">
      {/* Question Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
            {question.subject}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {question.difficulty}
          </span>
        </div>
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {question.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-auto">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Question:</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {question.content.questionText}
          </p>
        </div>

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
                  <span className="text-gray-700">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submitted Message */}
        {submitted && (
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="font-semibold text-blue-800">
              Answer submitted! Check the chat for feedback.
            </p>
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

