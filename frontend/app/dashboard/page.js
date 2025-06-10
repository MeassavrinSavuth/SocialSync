// app/dashboard/page.js
'use client'; // This directive makes it a Client Component

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const searchParams = useSearchParams(); // Hook to access URL query parameters
  const router = useRouter(); // Hook for programmatic navigation
  const [userEmail, setUserEmail] = useState(''); // State to display user info

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('Tokens received from backend!');
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);

      // 1. Store the tokens securely (e.g., in localStorage)
      //    Note: For production, consider HttpOnly cookies or more secure methods for tokens.
      //    For simplicity here, localStorage is used.
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      console.log('Tokens stored in localStorage.');

      // 2. Clean the URL (remove tokens from the URL bar)
      //    'replace' avoids adding this cleaned URL to browser history.
      router.replace('/dashboard');
      console.log('URL cleaned.');

      // Optional: Fetch user profile from your backend using the new access token
      // Assuming your backend has a /api/user/profile endpoint on localhost:8080
      fetch('http://localhost:8080/api/user/profile', { 
          headers: {
              'Authorization': `Bearer ${accessToken}`
          }
      })
      .then(response => {
          if (!response.ok) {
              // Handle non-2xx responses
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          if (data && data.email) {
              setUserEmail(data.email);
          } else {
              setUserEmail('User Email Not Found');
          }
      })
      .catch(error => {
          console.error('Error fetching user profile:', error);
          setUserEmail('Failed to load user email');
      });


    } else {
      // If no tokens are in the URL, check localStorage (for subsequent visits or refreshes)
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedAccessToken || !storedRefreshToken) {
        console.log('No tokens found. User is not logged in.');
        // Optionally redirect to login page if no tokens
        // router.push('/login'); 
      } else {
        console.log('Tokens found in localStorage for subsequent visit.');
        // In a real app, you might validate these tokens or refresh them
        // before displaying the dashboard content.
        // You could also fetch user details here if not already set
        // setUserEmail(someLogicToGetUserEmailFromStoredTokens);
      }
    }
  }, [searchParams, router]); // Dependencies for useEffect: re-run if URL search params change

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUserEmail(''); // Clear user email state
    console.log('Logged out. Tokens removed from localStorage.');
    router.push('/login'); // Redirect to your login page (create an app/login/page.js)
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard</h1>
      {userEmail ? (
          <p>Welcome, {userEmail}!</p>
      ) : (
          <p>Welcome! Loading user info...</p>
      )}

      <p>
        This is your private dashboard. Your tokens have been processed.
      </p>
      <button
        onClick={handleLogout}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
      <p>
        <Link href="/">Go to Home</Link>
      </p>
    </div>
  );
}