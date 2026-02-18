'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Link from 'next/link';

interface MembershipInvoice {
  id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  description: string | null;
  createdAt: string;
  subscription: {
    plan: {
      name: string;
      interval: string;
    };
  };
}

export default function BillingHistoryPage() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: MembershipInvoice[];
    total: number;
  }>({
    queryKey: ['billingHistory', page],
    queryFn: async () => {
      const res = await fetch(
        `/api/memberships/billing-history?limit=${limit}&offset=${page * limit}`,
      );
      if (!res.ok) throw new Error('Failed to fetch billing history');
      return res.json();
    },
  });

  const invoices = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status: MembershipInvoice['status']) => {
    const badges = {
      paid: { color: 'bg-green-100 text-green-800', icon: ['fal', 'check-circle'], label: 'Paid' },
      open: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: ['fal', 'exclamation-circle'],
        label: 'Open',
      },
      draft: { color: 'bg-gray-100 text-gray-800', icon: ['fal', 'file-invoice'], label: 'Draft' },
      void: {
        color: 'bg-red-100 text-red-800',
        icon: ['fal', 'exclamation-circle'],
        label: 'Void',
      },
      uncollectible: {
        color: 'bg-red-100 text-red-800',
        icon: ['fal', 'exclamation-circle'],
        label: 'Uncollectible',
      },
    };
    const badge = badges[status];
    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const downloadInvoice = (_invoiceId: string) => {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <FontAwesomeIcon
          icon={['fal', 'exclamation-circle']}
          className="text-6xl text-red-600 mb-4"
        />
        <p className="text-lg text-red-600">Failed to load billing history</p>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Billing History</h1>
          <p className="text-gray-600">View and download your past invoices</p>
        </div>
        <Link
          href="/account/membership"
          className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          Back to Membership
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200">
          <FontAwesomeIcon
            icon={['fal', 'file-invoice-dollar']}
            className="text-8xl text-gray-400 mb-4"
          />
          <p className="text-lg text-gray-600">No billing history yet</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {invoice.description || `${invoice.subscription.plan.name} Membership`}
                      {invoice.periodStart && invoice.periodEnd && (
                        <div className="text-xs text-gray-500">
                          {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                          {new Date(invoice.periodEnd).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${parseFloat(invoice.amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.invoicePdfUrl ? (
                        <a
                          href={invoice.invoicePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark"
                        >
                          <FontAwesomeIcon icon={['fal', 'download']} className="text-base" />
                          Download
                        </a>
                      ) : (
                        <button
                          onClick={() => downloadInvoice(invoice.id)}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark"
                        >
                          <FontAwesomeIcon icon={['fal', 'download']} className="text-base" />
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      ${parseFloat(invoice.amount.toString()).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>

                <div className="text-sm text-gray-700 mb-3">
                  {invoice.description || `${invoice.subscription.plan.name} Membership`}
                </div>

                {invoice.periodStart && invoice.periodEnd && (
                  <div className="text-xs text-gray-500 mb-3">
                    Period: {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                    {new Date(invoice.periodEnd).toLocaleDateString()}
                  </div>
                )}

                {invoice.invoicePdfUrl ? (
                  <a
                    href={invoice.invoicePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-dark text-sm"
                  >
                    <FontAwesomeIcon icon={['fal', 'download']} className="text-base" />
                    Download Invoice
                  </a>
                ) : (
                  <button
                    onClick={() => downloadInvoice(invoice.id)}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-dark text-sm"
                  >
                    <FontAwesomeIcon icon={['fal', 'download']} className="text-base" />
                    Download Invoice
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}{' '}
                invoices
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
