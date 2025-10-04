'use client';

import { Question } from '@/lib/questions';

interface QuestionCardProps {
  question: Question;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

export default function QuestionCard({ question, value, onChange }: QuestionCardProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none h-32"
          />
        );

      case 'select':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label
                key={option}
                className={`block p-4 border rounded-lg cursor-pointer transition ${
                  value === option
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  className="mr-3"
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label
                key={option}
                className={`block p-4 border rounded-lg cursor-pointer transition ${
                  (value as string[]).includes(option)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={(value as string[]).includes(option)}
                  onChange={(e) => {
                    const currentValues = value as string[];
                    if (e.target.checked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v) => v !== option));
                    }
                  }}
                  className="mr-3"
                />
                {option}
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {question.question}
      </h2>
      {renderInput()}
    </div>
  );
}
