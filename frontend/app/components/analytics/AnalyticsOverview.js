'use client';

import React, { useState } from 'react';
import { useAnalytics } from '../../hooks/api/useAnalytics';
import MetricCard from './MetricCard';
import EngagementChart from './EngagementChart';
import PlatformComparison from './PlatformComparison';
import TopPostsTable from './TopPostsTable';
import DateRangePicker from './DateRangePicker';
import PlatformFilter from './PlatformFilter';

export default function AnalyticsOverview() {
  const { analytics, loading, error, fetchAnalytics } = useAnalytics();
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    fetchAnalytics({
      startDate,
      endDate,
      platforms: selectedPlatforms
    });
  };

  const handlePlatformFilter = (platforms) => {
    setSelectedPlatforms(platforms);
    fetchAnalytics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      platforms
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-gray-600">Track your social media performance across platforms</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <DateRangePicker
            onDateRangeChange={handleDateRangeChange}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
          <PlatformFilter
            onPlatformChange={handlePlatformFilter}
            selectedPlatforms={selectedPlatforms}
          />
        </div>
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

      {/* Top Posts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Posts</h2>
        <TopPostsTable posts={analytics.top_posts} />
      </div>
    </div>
  );
}
