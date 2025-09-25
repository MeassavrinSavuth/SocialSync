'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PlatformComparison({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Comparison</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No platform data available
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Comparison</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_likes" fill="#3B82F6" name="Likes" />
            <Bar dataKey="total_comments" fill="#10B981" name="Comments" />
            <Bar dataKey="total_shares" fill="#F59E0B" name="Shares" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Platform engagement pie chart */}
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Engagement Distribution</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ platform, total_engagement }) => `${platform}: ${total_engagement}`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="total_engagement"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}