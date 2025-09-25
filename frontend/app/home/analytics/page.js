'use client';

import React from 'react';
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AnalyticsOverview />
      </div>
    </div>
  );
}
