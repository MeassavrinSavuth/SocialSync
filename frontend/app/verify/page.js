'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const VerifyEmailContent = () => {
  const [formData, setFormData] = useState({ email: '', token: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenFromURL = searchParams.get('token');
    if (tokenFromURL) {
      setFormData(prev => ({ ...prev, token: tokenFromURL }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const res = await fetch('http://localhost:8080/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      setMessage(data.message);

      setTimeout(() => {
        window.location.href = '/login'; // ✅ Redirect after success
      }, 2000);
    } catch (err) {
      setError(err.message);
    }


  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl text-black font-bold mb-4">Verify Your Email</h2>
      {message && <div className="bg-green-100 text-green-800 p-2 mb-4 rounded">{message}</div>}
      {error && <div className="bg-red-100 text-red-800 p-2 mb-4 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
          className="w-full px-4 py-2 text-black border rounded"
        />
        <input
          name="token"
          type="text"
          value={formData.token}
          onChange={handleChange}
          placeholder="Verification Token"
          required
          className="w-full px-4 py-2 text-black border rounded"
        />
        <button type="submit" className="w-full bg-black text-white py-2 rounded">
          Verify Email
        </button>
      </form>
    </div>
  );
};

const VerifyEmail = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
};

export default VerifyEmail;
