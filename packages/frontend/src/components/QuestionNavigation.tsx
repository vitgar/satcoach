interface QuestionNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onNavigate: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  questionsPerPage?: number;
}

export const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  currentIndex,
  totalQuestions,
  onNavigate,
  onPrevious,
  onNext,
  questionsPerPage = 10,
}) => {
  if (totalQuestions === 0) return null;

  // Calculate batch info
  const currentBatchStart = Math.floor(currentIndex / questionsPerPage) * questionsPerPage;
  const currentBatchEnd = Math.min(currentBatchStart + questionsPerPage, totalQuestions);
  const totalBatches = Math.ceil(totalQuestions / questionsPerPage);
  const currentBatch = Math.floor(currentIndex / questionsPerPage) + 1;

  // Questions in current batch (for numbered buttons)
  const questionsInBatch = Array.from(
    { length: currentBatchEnd - currentBatchStart },
    (_, i) => currentBatchStart + i
  );

  const goToPreviousBatch = () => {
    const newIndex = Math.max(0, currentBatchStart - questionsPerPage);
    onNavigate(newIndex);
  };

  const goToNextBatch = () => {
    const newIndex = Math.min(totalQuestions - 1, currentBatchEnd);
    onNavigate(newIndex);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Main Navigation */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            currentIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {/* Question Counter */}
        <div className="text-sm text-gray-600">
          Question <span className="font-semibold text-gray-900">{currentIndex + 1}</span> of{' '}
          <span className="font-semibold text-gray-900">{totalQuestions}</span>
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentIndex >= totalQuestions - 1}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            currentIndex >= totalQuestions - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          Next
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Question Number Buttons (Current Batch) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {questionsInBatch.map((index) => (
          <button
            key={index}
            onClick={() => onNavigate(index)}
            className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
              index === currentIndex
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Batch Navigation (if multiple batches) */}
      {totalBatches > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
          <button
            onClick={goToPreviousBatch}
            disabled={currentBatch === 1}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentBatch === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            Previous 10
          </button>

          <span className="text-sm text-gray-500">
            Batch <span className="font-medium">{currentBatch}</span> of{' '}
            <span className="font-medium">{totalBatches}</span>
          </span>

          <button
            onClick={goToNextBatch}
            disabled={currentBatch === totalBatches}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentBatch === totalBatches
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Next 10
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};






