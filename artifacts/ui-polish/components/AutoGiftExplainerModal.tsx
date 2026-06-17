'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutoGiftExplainerProps {
  onClose?: () => void;
  onStart?: () => void;
}

/**
 * AutoGift Explainer Modal
 * Shows users exactly how AutoGift works before they commit
 */

export function AutoGiftExplainerModal({
  onClose,
  onStart,
}: AutoGiftExplainerProps) {
  const [expandedStep, setExpandedStep] = useState(0);

  const steps = [
    {
      number: 1,
      title: 'Add Recipients',
      description: 'Tell Givit who you want to give gifts to.',
      details: 'You can add friends, family, or colleagues. Just their name and birthday.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      number: 2,
      title: 'Set Occasions',
      description: 'We remember birthdays, anniversaries, and holidays.',
      details: 'We'll track the dates and remind you a few weeks before.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      number: 3,
      title: 'Get Reminders',
      description: 'We'll suggest personalized gifts on your timeline.',
      details: 'You\'ll get notified with 3-5 AI-curated suggestions based on their interests.',
      color: 'from-green-500 to-green-600',
    },
    {
      number: 4,
      title: 'Approve & Ship',
      description: 'One-click approval and we handle the rest.',
      details: 'Review the suggestion, click "Approve", and we ship it directly to them.',
      color: 'from-pink-500 to-pink-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">How AutoGift Works</h2>
          <p className="text-gray-600 text-sm mt-1">
            Set it once, we handle the rest. Never forget a birthday again.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-6 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Step Header */}
              <button
                onClick={() =>
                  setExpandedStep(
                    expandedStep === step.number - 1 ? -1 : step.number - 1
                  )
                }
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  {/* Step Number Badge */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${
                      step.color
                    } text-white font-bold flex items-center justify-center`}
                  >
                    {step.number}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition ${
                    expandedStep === step.number - 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded Details */}
              {expandedStep === step.number - 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700">{step.details}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer with CTA */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition font-semibold"
          >
            Maybe Later
          </button>
          <button
            onClick={onStart}
            className="flex-1 px-4 py-3 text-white bg-primary-600 rounded hover:bg-primary-700 transition font-semibold"
          >
            Get Started with AutoGift
          </button>
        </div>
      </div>
    </div>
  );
}
