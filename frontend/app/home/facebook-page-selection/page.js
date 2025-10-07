'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';

export default function FacebookPageSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const protectedFetch = useProtectedFetch();
  
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get pages data from URL parameters (base64 encoded)
    const pagesParam = searchParams.get('pages');
    if (pagesParam) {
      try {
        // Decode base64 and parse JSON
        const decodedPages = atob(pagesParam);
        const pagesData = JSON.parse(decodedPages);
        setPages(pagesData);
      } catch (err) {
        setError('Invalid pages data: ' + err.message);
      }
    } else {
      setError('Missing pages data');
    }
  }, [searchParams]);

  const handlePageToggle = (page) => {
    setSelectedPages(prev => {
      const isSelected = prev.some(p => p.id === page.id);
      if (isSelected) {
        return prev.filter(p => p.id !== page.id);
      } else {
        return [...prev, page];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages([...pages]);
    }
  };

  const handleConnect = async () => {
    if (selectedPages.length === 0) {
      setError('Please select at least one page');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await protectedFetch('/facebook/select-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedPages: selectedPages
        }),
      });

      if (response && response.success) {
        router.push('/home/manage-accounts?connected=facebook');
      } else {
        setError(response?.message || 'Failed to connect pages');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Facebook pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Select Facebook Pages</h1>
            <p className="text-gray-600 mt-2">
              Choose which Facebook pages you want to connect to your account. 
              You can select multiple pages and manage them separately.
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
              >
                {selectedPages.length === pages.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="ml-3 text-sm text-gray-600">
                {selectedPages.length} of {pages.length} pages selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => {
                const isSelected = selectedPages.some(p => p.id === page.id);
                return (
                  <div
                    key={page.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handlePageToggle(page)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600">
                            {page.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {page.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Page ID: {page.id}
                        </p>
                        {isSelected && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Selected
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => router.push('/home/manage-accounts')}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={loading || selectedPages.length === 0}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Connecting...' : `Connect ${selectedPages.length} Page${selectedPages.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
