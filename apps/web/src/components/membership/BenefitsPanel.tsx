'use client';

import React from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import type { IconPrefix, IconName } from '@/types/fontawesome';

interface Benefit {
  text: string;
  icon?:
    | 'check'
    | 'gavel'
    | 'clock'
    | 'robot'
    | 'shield'
    | 'chart'
    | 'concierge'
    | 'infinity'
    | 'graduate'
    | 'book'
    | 'comment'
    | 'percent';
  highlight?: boolean;
}

interface BenefitsPanelProps {
  benefits: (string | Benefit)[];
  planName?: string;
  className?: string;
}

const iconMap: Record<string, [IconPrefix, IconName]> = {
  check: ['fal', 'check-circle'],
  gavel: ['fal', 'gavel'],
  clock: ['fal', 'clock'],
  robot: ['fal', 'robot'],
  shield: ['fal', 'shield-alt'],
  chart: ['fal', 'chart-line'],
  concierge: ['fal', 'user-tie'],
  infinity: ['fal', 'infinity'],
  graduate: ['fal', 'graduation-cap'],
  book: ['fal', 'book'],
  comment: ['fal', 'comment-dots'],
  percent: ['fal', 'percent'],
};

/**
 * Auto-detect icon based on benefit text
 */
function getAutoIcon(text: string): [IconPrefix, IconName] {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('auction') || lowerText.includes('fee')) return ['fal', 'gavel'];
  if (lowerText.includes('early access') || lowerText.includes('24 hour')) return ['fal', 'clock'];
  if (lowerText.includes('ai') || lowerText.includes('research tool')) return ['fal', 'robot'];
  if (lowerText.includes('authentication')) return ['fal', 'shield-alt'];
  if (lowerText.includes('value') || lowerText.includes('chart') || lowerText.includes('data'))
    return ['fal', 'chart-line'];
  if (
    lowerText.includes('concierge') ||
    lowerText.includes('bookseller') ||
    lowerText.includes('guidance')
  )
    return ['fal', 'user-tie'];
  if (lowerText.includes('unlimited')) return ['fal', 'infinity'];
  if (
    lowerText.includes('master class') ||
    lowerText.includes('course') ||
    lowerText.includes('expert')
  )
    return ['fal', 'graduation-cap'];
  if (lowerText.includes('collection') || lowerText.includes('book request'))
    return ['fal', 'book'];
  if (lowerText.includes('social') || lowerText.includes('posting') || lowerText.includes('offer'))
    return ['fal', 'comment-dots'];
  if (
    lowerText.includes('save') ||
    lowerText.includes('%') ||
    lowerText.includes('off') ||
    lowerText.includes('discount')
  )
    return ['fal', 'percent'];

  return ['fal', 'check-circle'];
}

export default function BenefitsPanel({ benefits, planName, className = '' }: BenefitsPanelProps) {
  return (
    <div className={`bg-white p-6 border border-gray-200 ${className}`}>
      {planName && <h3 className="text-2xl font-bold text-gray-900 mb-6">{planName} Benefits</h3>}

      <ul className="space-y-4">
        {benefits.map((benefit, index) => {
          const isString = typeof benefit === 'string';
          const text = isString ? benefit : benefit.text;
          const highlight = isString ? false : benefit.highlight || false;

          // Get icon
          let icon: [IconPrefix, IconName];
          if (!isString && benefit.icon) {
            icon = iconMap[benefit.icon] || ['fal', 'check-circle'];
          } else {
            icon = getAutoIcon(text);
          }

          return (
            <li
              key={index}
              className={`flex items-start gap-4 ${highlight ? 'bg-secondary/10 -mx-2 px-2 py-2' : ''}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <FontAwesomeIcon
                  icon={icon}
                  className={`w-5 h-5 ${
                    highlight
                      ? 'text-primary'
                      : text.toLowerCase().includes('save') || text.toLowerCase().includes('off')
                        ? 'text-green-600'
                        : 'text-secondary'
                  }`}
                />
              </div>
              <span
                className={`leading-relaxed ${
                  highlight ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}
              >
                {text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
