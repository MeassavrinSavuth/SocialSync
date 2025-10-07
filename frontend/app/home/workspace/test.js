"use client";
import React, { useState } from 'react';

export default function SimpleWorkspacePage() {
  const [error, setError] = useState(null);

  try {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-4">Workspace - Simple Test</h1>
        <p>This is a simple workspace page to test if the basic structure works.</p>
        <div className="mt-4 space-y-2">
          <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Tasks</button>
          <button className="bg-green-500 text-white px-4 py-2 rounded mr-2">Drafts</button>
          <button className="bg-purple-500 text-white px-4 py-2 rounded">Media</button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}
      </div>
    );
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{err.message}</p>
        </div>
      </div>
    );
  }
}
