'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ComparisonFeature {
  name: string;
  silver: boolean | string;
  gold: boolean | string;
  platinum: boolean | string;
}

const features: ComparisonFeature[] = [
  {
    name: 'Access to standard listings',
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    name: 'Monthly collector newsletter',
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    name: 'Purchase discount',
    silver: '5%',
    gold: '10%',
    platinum: '15%',
  },
  {
    name: 'Auction discount',
    silver: false,
    gold: '15%',
    platinum: '20%',
  },
  {
    name: 'Early access to sales',
    silver: true,
    gold: '24h priority',
    platinum: 'First access',
  },
  {
    name: 'Customer support',
    silver: 'Standard',
    gold: 'Priority',
    platinum: 'Concierge',
  },
  {
    name: 'Free shipping threshold',
    silver: false,
    gold: 'Orders $50+',
    platinum: 'All orders',
  },
  {
    name: 'Rare & limited books access',
    silver: false,
    gold: 'Priority',
    platinum: 'First access',
  },
  {
    name: 'Private listings access',
    silver: false,
    gold: true,
    platinum: true,
  },
  {
    name: 'Members-only auctions',
    silver: false,
    gold: false,
    platinum: 'VIP access',
  },
  {
    name: 'Collector events',
    silver: false,
    gold: 'Select events',
    platinum: 'VIP events',
  },
  {
    name: 'Collector magazine',
    silver: false,
    gold: 'Quarterly (digital)',
    platinum: 'Monthly (digital)',
  },
  {
    name: 'Personal curator',
    silver: false,
    gold: false,
    platinum: true,
  },
  {
    name: 'Virtual consultations',
    silver: false,
    gold: false,
    platinum: 'Monthly',
  },
  {
    name: 'Annual store credit',
    silver: false,
    gold: false,
    platinum: '$100',
  },
  {
    name: 'Worldwide shipping',
    silver: false,
    gold: false,
    platinum: 'Free',
  },
];

export default function PlanComparisonTable() {
  const renderCell = (value: boolean | string) => {
    if (value === true) {
      return (
        <svg
          className="text-2xl text-green-600 mx-auto"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M5 13l4 4L19 7"></path>
        </svg>
      );
    }
    if (value === false) {
      return (
        <svg
          className="text-xl text-slate-300 mx-auto"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      );
    }
    return <span className="text-sm font-medium text-gray-700">{value}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="w-full overflow-x-auto"
    >
      <div className="bg-white shadow-xl border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark px-8 py-6">
          <h2 className="text-3xl font-bold text-white text-center">Compare Plans</h2>
          <p className="text-white/80 text-center mt-2">
            Find the perfect membership for your collecting journey
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th
                  className="text-left py-4 px-6 text-gray-700 font-semibold"
                  style={{ minWidth: '250px' }}
                >
                  Features
                </th>
                <th
                  className="text-center py-4 px-6 text-gray-600 font-bold"
                  style={{ minWidth: '150px' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">Silver</span>
                    <span className="text-sm font-normal text-gray-500">$10/mo</span>
                  </div>
                </th>
                <th
                  className="text-center py-4 px-6 text-secondary font-bold"
                  style={{ minWidth: '150px' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">Gold</span>
                    <span className="text-sm font-normal text-gray-500">$25/mo</span>
                  </div>
                </th>
                <th
                  className="text-center py-4 px-6 text-primary font-bold"
                  style={{ minWidth: '150px' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">Platinum</span>
                    <span className="text-sm font-normal text-gray-500">$50/mo</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  <td className="py-4 px-6 text-gray-700">{feature.name}</td>
                  <td className="py-4 px-6 text-center">{renderCell(feature.silver)}</td>
                  <td className="py-4 px-6 text-center bg-secondary/5">
                    {renderCell(feature.gold)}
                  </td>
                  <td className="py-4 px-6 text-center">{renderCell(feature.platinum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm italic">
            All plans include secure payment processing and can be cancelled anytime.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
