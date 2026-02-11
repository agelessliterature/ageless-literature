'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';

export default function VendorReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState('30');

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['vendor-reports-summary'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/reports/summary'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch summary');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-reports-products'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/reports/products'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const summary = summaryData || {};
  const topProducts = productsData?.topProducts || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">View detailed sales reports and analytics</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black w-full sm:w-auto"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center mb-8">
          <p className="text-gray-500">Loading summary...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 border-l-4 border-green-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'dollar-sign']}
              className="text-2xl sm:text-3xl text-green-600 mb-2"
            />
            <p className="text-xl sm:text-3xl font-bold text-gray-900">
              ${parseFloat(summary.lifetimeVendorEarnings || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Total Earnings</p>
          </div>

          <div className="bg-white p-6 border-l-4 border-blue-500 shadow-sm">
            <FontAwesomeIcon icon={['fal', 'chart-line']} className="text-3xl text-blue-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              ${parseFloat(summary.lifetimeGrossSales || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Gross Sales</p>
          </div>

          <div className="bg-white p-6 border-l-4 border-purple-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'shopping-cart']}
              className="text-3xl text-purple-600 mb-2"
            />
            <p className="text-3xl font-bold text-gray-900">{summary.totalOrders || 0}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>

          <div className="bg-white p-6 border-l-4 border-yellow-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'percentage']}
              className="text-3xl text-yellow-600 mb-2"
            />
            <p className="text-3xl font-bold text-gray-900">{summary.conversionRate || '0.00'}%</p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
        </div>
      )}

      {/* Commission Breakdown */}
      {summary.commissions && (
        <div className="bg-white border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-primary mb-4">Commission Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-4 bg-gray-50">
              <span className="text-gray-700">Platform Commission (8%)</span>
              <span className="font-bold text-red-600">
                -${parseFloat(summary.commissions.platformCommission || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50">
              <span className="text-gray-700">Your Net Earnings (92%)</span>
              <span className="font-bold text-green-600">
                ${parseFloat(summary.lifetimeVendorEarnings || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Products */}
      {productsLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-primary">Top Performing Products</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No product data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product: any) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        <div className="text-sm text-gray-500">{product.author}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.views || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {product.salesCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        ${parseFloat(product.revenue || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.conversionRate || '0.00'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
