'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PlanBadge from './PlanBadge';

interface PlanCardProps {
  name: string;
  price: number;
  tagline: string;
  features: string[];
  slug: string;
  highlight?: 'popular' | 'premium' | 'starter' | null;
  index?: number;
  isCurrentPlan?: boolean;
}

export default function PlanCard({
  name,
  price,
  tagline,
  features,
  slug,
  highlight = null,
  index = 0,
  isCurrentPlan = false,
}: PlanCardProps) {
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: index * 0.2,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  // Determine card styling based on plan
  const getCardStyles = () => {
    if (highlight === 'popular') {
      return 'border-2 border-secondary shadow-2xl';
    }
    if (highlight === 'premium') {
      return 'border-2 border-primary shadow-2xl';
    }
    return 'border border-gray-200';
  };

  const getTitleColor = () => {
    if (name.toLowerCase() === 'silver') return 'text-gray-600';
    if (name.toLowerCase() === 'gold') return 'text-secondary';
    if (name.toLowerCase() === 'platinum') return 'text-primary';
    return 'text-gray-800';
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative bg-white p-8 flex flex-col h-full transition-all duration-300 hover:shadow-2xl ${getCardStyles()}`}
    >
      {/* Badge */}
      {highlight && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <PlanBadge variant={highlight} />
        </div>
      )}

      {/* Current Plan Indicator */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className={`text-3xl font-bold mb-2 ${getTitleColor()}`}>{name}</h3>
        <p className="text-gray-600 italic text-sm mb-4">{tagline}</p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold text-gray-900">${price}</span>
          <span className="text-gray-500 text-lg">/month</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6"></div>

      {/* Features */}
      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <FontAwesomeIcon
              icon={['fal', 'check-circle']}
              className="text-secondary text-lg mt-0.5 flex-shrink-0"
            />
            <span className="text-gray-700 leading-relaxed text-sm font-bold">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <motion.button
        onClick={() => {
          if (isCurrentPlan) {
            window.location.href = '/memberships';
          } else {
            window.location.href = `/api/memberships/subscribe?plan=${slug}`;
          }
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`block w-full text-center py-4 px-6 font-semibold text-lg transition-all duration-300 cursor-pointer ${
          highlight === 'popular'
            ? 'bg-gradient-to-r from-secondary to-secondary-light text-primary shadow-lg hover:shadow-xl'
            : highlight === 'premium'
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg hover:shadow-xl'
              : 'bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-xl'
        }`}
      >
        {isCurrentPlan ? 'Manage Plan' : 'Join Now'}
      </motion.button>

      {/* Upgrade hint for current plan */}
      {isCurrentPlan && name.toLowerCase() !== 'platinum' && (
        <p className="text-center text-xs text-gray-500 mt-3">
          Want more benefits? Consider upgrading.
        </p>
      )}
    </motion.div>
  );
}
