'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EngagementChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No engagement data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value, name) => [value, name]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="likes" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Likes"
            />
            <Line 
              type="monotone" 
              dataKey="comments" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Comments"
            />
            <Line 
              type="monotone" 
              dataKey="shares" 
              stroke="#F59E0B" 
              strokeWidth={2}
              name="Shares"
            />
            <Line 
              type="monotone" 
              dataKey="engagement" 
              stroke="#EF4444" 
              strokeWidth={3}
              name="Total Engagement"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}