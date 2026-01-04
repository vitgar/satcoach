import { useState } from 'react';

interface SubjectSelectorProps {
  onSelect: (subject: string) => void;
  selectedSubject: string | null;
  disabled?: boolean;
}

const subjects = [
  {
    id: 'Math',
    name: 'Math',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Algebra, geometry, data analysis',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    selectedColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500',
    iconColor: 'text-blue-600',
  },
  {
    id: 'Reading',
    name: 'Reading',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    description: 'Comprehension, analysis, vocabulary',
    color: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    selectedColor: 'bg-amber-100 border-amber-500 ring-2 ring-amber-500',
    iconColor: 'text-amber-600',
  },
  {
    id: 'Writing',
    name: 'Writing',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    description: 'Grammar, structure, expression',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    selectedColor: 'bg-purple-100 border-purple-500 ring-2 ring-purple-500',
    iconColor: 'text-purple-600',
  },
];

export const SubjectSelector = ({ onSelect, selectedSubject, disabled = false }: SubjectSelectorProps) => {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-center">
        Select a subject to begin your guided review:
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          const isSelected = selectedSubject === subject.id;
          const isHovered = hoveredSubject === subject.id;
          
          return (
            <button
              key={subject.id}
              onClick={() => !disabled && onSelect(subject.id)}
              onMouseEnter={() => setHoveredSubject(subject.id)}
              onMouseLeave={() => setHoveredSubject(null)}
              disabled={disabled}
              className={`
                p-6 rounded-xl border-2 transition-all duration-200
                ${isSelected ? subject.selectedColor : subject.color}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${!isSelected && !disabled ? 'hover:shadow-md' : ''}
              `}
            >
              <div className={`${subject.iconColor} mb-3 flex justify-center`}>
                {subject.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {subject.name}
              </h3>
              <p className={`text-sm text-gray-500 transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-70'}`}>
                {subject.description}
              </p>
              
              {isSelected && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white rounded-full text-gray-700">
                    Selected
                    <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};






