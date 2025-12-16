import { useState, useRef, useEffect } from 'react';

interface MathSymbolPickerProps {
  onSymbolSelect: (symbol: string) => void;
}

// SAT Math symbols organized by category
const SYMBOL_CATEGORIES = {
  'Common': [
    { symbol: '√', label: 'Square root', latex: '\\sqrt{}' },
    { symbol: '²', label: 'Squared', latex: '^2' },
    { symbol: '³', label: 'Cubed', latex: '^3' },
    { symbol: 'ⁿ', label: 'Exponent', latex: '^n' },
    { symbol: '±', label: 'Plus/minus', latex: '\\pm' },
    { symbol: '×', label: 'Multiply', latex: '\\times' },
    { symbol: '÷', label: 'Divide', latex: '\\div' },
    { symbol: '≠', label: 'Not equal', latex: '\\neq' },
  ],
  'Fractions': [
    { symbol: '½', label: 'One half', latex: '\\frac{1}{2}' },
    { symbol: '⅓', label: 'One third', latex: '\\frac{1}{3}' },
    { symbol: '¼', label: 'One quarter', latex: '\\frac{1}{4}' },
    { symbol: '⅔', label: 'Two thirds', latex: '\\frac{2}{3}' },
    { symbol: '¾', label: 'Three quarters', latex: '\\frac{3}{4}' },
    { symbol: 'ᵃ⁄ᵦ', label: 'Fraction', latex: '\\frac{a}{b}' },
  ],
  'Inequalities': [
    { symbol: '≤', label: 'Less than or equal', latex: '\\leq' },
    { symbol: '≥', label: 'Greater than or equal', latex: '\\geq' },
    { symbol: '<', label: 'Less than', latex: '<' },
    { symbol: '>', label: 'Greater than', latex: '>' },
    { symbol: '≈', label: 'Approximately', latex: '\\approx' },
  ],
  'Greek': [
    { symbol: 'π', label: 'Pi', latex: '\\pi' },
    { symbol: 'θ', label: 'Theta', latex: '\\theta' },
    { symbol: 'α', label: 'Alpha', latex: '\\alpha' },
    { symbol: 'β', label: 'Beta', latex: '\\beta' },
    { symbol: '°', label: 'Degree', latex: '^\\circ' },
  ],
  'Grouping': [
    { symbol: '()', label: 'Parentheses', latex: '()' },
    { symbol: '[]', label: 'Brackets', latex: '[]' },
    { symbol: '{}', label: 'Braces', latex: '\\{\\}' },
    { symbol: '||', label: 'Absolute value', latex: '|x|' },
  ],
};

export const MathSymbolPicker: React.FC<MathSymbolPickerProps> = ({ onSymbolSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Common');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSymbolClick = (symbol: string) => {
    onSymbolSelect(symbol);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        title="Insert math symbol"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">Math Symbols</h4>
            <p className="text-xs text-gray-500 mt-1">Click to insert symbol</p>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {Object.keys(SYMBOL_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Symbols Grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {SYMBOL_CATEGORIES[activeCategory as keyof typeof SYMBOL_CATEGORIES].map(
                ({ symbol, label }) => (
                  <button
                    key={label}
                    onClick={() => handleSymbolClick(symbol)}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors group"
                    title={label}
                  >
                    <span className="text-2xl text-gray-700 group-hover:text-primary-600">
                      {symbol}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 text-center leading-tight">
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Footer with tip */}
          <div className="p-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <p className="text-xs text-gray-600 text-center">
              💡 Tip: You can also type LaTeX math using $ symbols: <code className="bg-gray-200 px-1 rounded">$x^2$</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

