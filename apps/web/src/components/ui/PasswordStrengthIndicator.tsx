'use client';

import React from 'react';
import { getPasswordStrength } from '@/lib/validation/authSchemas';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showRequirements?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  className = '',
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const analysis = getPasswordStrength(password);

  // Color mapping for different strength levels
  const getStrengthColor = (color: string) => {
    const colors = {
      gray: 'bg-gray-300',
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  const getTextColor = (color: string) => {
    const colors = {
      gray: 'text-gray-600',
      red: 'text-red-600',
      orange: 'text-orange-600',
      yellow: 'text-yellow-600',
      blue: 'text-blue-600',
      green: 'text-green-600',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  // Calculate progress percentage (max 10 points)
  const progress = Math.min((analysis.score / 10) * 100, 100);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-semibold ${getTextColor(analysis.color)}`}>
            {analysis.label}
          </span>
        </div>

        <div className="w-full bg-gray-200  h-2">
          <div
            className={`h-2  transition-all duration-300 ${getStrengthColor(analysis.color)}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Entropy Score */}
        {analysis.entropy > 0 && (
          <div className="text-xs text-gray-500">Entropy: {Math.round(analysis.entropy)} bits</div>
        )}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Password Requirements:</h4>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <RequirementItem met={analysis.requirements.length} text="At least 12 characters" />
            <RequirementItem
              met={analysis.requirements.lowercase}
              text="Contains lowercase letter"
            />
            <RequirementItem
              met={analysis.requirements.uppercase}
              text="Contains uppercase letter"
            />
            <RequirementItem met={analysis.requirements.numbers} text="Contains number" />
            <RequirementItem
              met={analysis.requirements.special}
              text="Contains special character"
            />
            <RequirementItem met={analysis.requirements.noCommon} text="Not a common password" />
            <RequirementItem met={analysis.requirements.noPatterns} text="No repetitive patterns" />
            <RequirementItem
              met={analysis.requirements.uniqueChars}
              text="At least 8 unique characters"
            />
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {analysis.feedback.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-gray-700">Suggestions:</h4>
          <ul className="space-y-1">
            {analysis.feedback.map((feedback, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{feedback}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? (
        <FontAwesomeIcon
          icon={['fal', 'check']}
          className="text-base text-green-500 flex-shrink-0"
        />
      ) : (
        <FontAwesomeIcon
          icon={['fal', 'times']}
          className="text-base text-gray-400 flex-shrink-0"
        />
      )}
      <span className="text-sm">{text}</span>
    </div>
  );
}
