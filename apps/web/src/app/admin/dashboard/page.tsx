'use client';

import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import type { IconPrefix, IconName } from '@/types/fontawesome';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api-url';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: [IconPrefix, IconName];
  trend?: 'up' | 'down';
}

function StatCard({ title, value, change, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="bg-white shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p
            className={`text-sm mt-2 flex items-center ${
              trend ? (trend === 'up' ? 'text-green-600' : 'text-red-600') : 'text-gray-500'
            }`}
          >
            {trend && (
              <FontAwesomeIcon
                icon={trend === 'up' ? ['fal', 'arrow-up'] : ['fal', 'arrow-down']}
                className="text-base mr-1"
              />
            )}
            {change}
          </p>
        </div>
        <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
          <FontAwesomeIcon icon={Icon} className="text-2xl text-primary" />
        </div>
      </div>
    </div>
  );
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  date: string;
}

interface RecentAction {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVendors: 0,
    totalSales: 0,
    activeMembers: 0,
    totalAuctions: 0,
  });
  const [quickActions, setQuickActions] = useState({
    pendingVendors: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data (using new aggregated endpoint)
    const fetchDashboardData = async () => {
      try {
        const API_URL = getApiUrl();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (session?.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        // Single API call to get all dashboard data
        const dashboardRes = await fetch(`${API_URL}/api/admin/dashboard`, {
          headers,
          credentials: 'include',
        });

        if (!dashboardRes.ok) {
          throw new Error(`Dashboard API failed: ${dashboardRes.status}`);
        }

        const dashboardData = await dashboardRes.json();

        if (!dashboardData.success) {
          throw new Error('Dashboard API returned error');
        }

        const data = dashboardData.data;

        // Set stats from aggregated response
        setStats({
          totalUsers: data.stats.totalUsers,
          activeVendors: data.stats.activeVendors,
          totalSales: data.stats.totalSales,
          activeMembers: data.stats.activeUsers, // Using active users as proxy for members
          totalAuctions: data.stats.totalAuctions,
        });

        // Set quick actions from aggregated response
        setQuickActions({
          pendingVendors: data.quickActions.pendingVendors,
          pendingOrders: data.quickActions.pendingOrders,
        });

        // Format and set recent orders from aggregated response
        if (data.recentOrders?.length > 0) {
          const formattedOrders = data.recentOrders.map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customer: order.customer,
            total: parseFloat(order.totalAmount || 0),
            status: order.status,
            date: formatRelativeTime(order.createdAt),
          }));
          setRecentOrders(formattedOrders);

          // Generate recent actions from aggregated data
          const actions: RecentAction[] = [];

          // Add recent orders as actions
          formattedOrders.slice(0, 2).forEach((order: any) => {
            actions.push({
              id: actions.length + 1,
              action: `Order ${order.orderNumber} placed`,
              user: order.customer,
              timestamp: order.date,
              type: 'success',
            });
          });

          // Add pending vendors notification from aggregated data
          if (data.quickActions.pendingVendors > 0) {
            actions.push({
              id: actions.length + 1,
              action: `${data.quickActions.pendingVendors} vendor application${data.quickActions.pendingVendors > 1 ? 's' : ''} awaiting review`,
              user: 'System',
              timestamp: 'Pending',
              type: 'warning',
            });
          }

          // Add user stats from aggregated data
          if (data.stats.totalUsers > 0) {
            actions.push({
              id: actions.length + 1,
              action: `Platform has ${data.stats.totalUsers} registered users`,
              user: 'System',
              timestamp: 'Current',
              type: 'info',
            });
          }

          setRecentActions(actions.slice(0, 5));
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      fetchDashboardData();
    }
  }, [session?.accessToken]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-xl text-green-600" />
        );
      case 'warning':
        return <FontAwesomeIcon icon={['fal', 'clock']} className="text-xl text-yellow-600" />;
      default:
        return <FontAwesomeIcon icon={['fal', 'box']} className="text-xl text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white shadow-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening with your platform today
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change="All time"
          icon={['fal', 'users']}
        />
        <StatCard
          title="Active Vendors"
          value={stats.activeVendors}
          change="Approved vendors"
          icon={['fal', 'store']}
        />
        <StatCard
          title="Total Sales"
          value={`$${stats.totalSales.toLocaleString()}`}
          change="Total payouts"
          icon={['fal', 'dollar-sign']}
        />
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          change="With active membership"
          icon={['fal', 'crown']}
        />
        <StatCard
          title="Total Auctions"
          value={stats.totalAuctions}
          change="Books & Products"
          icon={['fal', 'gavel']}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <div className="bg-white shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales Trend</h3>
          <div className="h-64 flex items-end justify-around space-x-2">
            {[45, 62, 58, 75, 68, 82, 90, 85, 95, 88, 100, 105].map((height, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary transition-all hover:bg-primary/80"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/admin/vendors?status=pending"
              className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition"
            >
              <span className="text-sm font-medium text-gray-900">Review Vendor Applications</span>
              {quickActions.pendingVendors > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white ">
                  {quickActions.pendingVendors}
                </span>
              )}
            </Link>
            <Link
              href="/admin/orders?status=pending"
              className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition"
            >
              <span className="text-sm font-medium text-gray-900">Process Pending Orders</span>
              {quickActions.pendingOrders > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-green-600 text-white ">
                  {quickActions.pendingOrders}
                </span>
              )}
            </Link>
            <Link
              href="/admin/memberships"
              className="flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition"
            >
              <span className="text-sm font-medium text-gray-900">Manage Memberships</span>
            </Link>
            <Link
              href="/admin/payouts"
              className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition"
            >
              <span className="text-sm font-medium text-gray-900">Process Payouts</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders & Recent Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-white shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <Link href="/admin/orders" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                    <span
                      className={`inline-flex items-center px-2 py-1  text-xs font-medium ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{order.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Actions */}
        <div className="bg-white shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Actions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActions.map((action) => (
              <div key={action.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">{getActionIcon(action.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{action.action}</p>
                    <p className="text-sm text-gray-600">{action.user}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
