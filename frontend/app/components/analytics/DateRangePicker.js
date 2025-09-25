'use client';

import React from 'react';

export default function DateRangePicker({ onDateRangeChange, startDate, endDate }) {
  const handleStartDateChange = (e) => {
    onDateRangeChange(e.target.value, endDate);
  };

  const handleEndDateChange = (e) => {
    onDateRangeChange(startDate, e.target.value);
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    onDateRangeChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">From:</label>
        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">To:</label>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={() => setQuickRange(7)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          7d
        </button>
        <button
          onClick={() => setQuickRange(30)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          30d
        </button>
        <button
          onClick={() => setQuickRange(90)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          90d
        </button>
      </div>
    </div>
  );
}