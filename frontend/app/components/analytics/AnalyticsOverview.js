'use client';

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../hooks/api/useAnalytics';
import MetricCard from './MetricCard';
import EngagementChart from './EngagementChart';
import PlatformComparison from './PlatformComparison';
import AccountSelector from './AccountSelector';

export default function AnalyticsOverview() {
  const { analytics, loading, error, fetchAnalytics } = useAnalytics();
  const [selectedAccounts, setSelectedAccounts] = useState([]); // Selected account IDs


  const handleAccountChange = (accountIds) => {
    console.log('Account selection changed:', accountIds);
    console.log('Current analytics before change:', analytics);
    setSelectedAccounts(accountIds);
    fetchAnalytics({
      accountIds
    });
  };

  // Fetch analytics on initial load
  useEffect(() => {
    console.log('Initial analytics fetch');
    fetchAnalytics({
      accountIds: selectedAccounts
    });
  }, []); // Only run on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading analytics: {error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  // Debug: Log analytics data structure
  console.log('Analytics data received:', analytics);
  console.log('Platform stats:', analytics.platform_stats);
  console.log('Engagement trend:', analytics.engagement_trend);
  console.log('Selected accounts:', selectedAccounts);
  console.log('Total posts from analytics:', analytics.total_posts);
  console.log('Total engagement from analytics:', analytics.total_engagement);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-gray-600">
            {selectedAccounts.length === 0 
              ? 'Track your social media performance across accounts'
              : `Showing data for ${selectedAccounts.length} selected account${selectedAccounts.length !== 1 ? 's' : ''}`
            }
          </p>
          {selectedAccounts.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Select specific accounts to view their analytics
            </p>
          )}
        </div>
        
      </div>

      {/* Account Selector */}
      <div className="mb-6">
        <AccountSelector
          selectedAccounts={selectedAccounts}
          onAccountChange={handleAccountChange}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Posts"
          value={analytics.total_posts}
          icon="📝"
          color="blue"
        />
        <MetricCard
          title="Total Engagement"
          value={analytics.total_engagement}
          icon="❤️"
          color="red"
        />
        <MetricCard
          title="Total Likes"
          value={analytics.platform_stats?.reduce((sum, platform) => sum + platform.total_likes, 0) || 0}
          icon="👍"
          color="green"
        />
        <MetricCard
          title="Total Comments"
          value={analytics.platform_stats?.reduce((sum, platform) => sum + platform.total_comments, 0) || 0}
          icon="💬"
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementChart data={analytics.engagement_trend} />
        <PlatformComparison data={analytics.platform_stats} />
      </div>

    </div>
  );
}
