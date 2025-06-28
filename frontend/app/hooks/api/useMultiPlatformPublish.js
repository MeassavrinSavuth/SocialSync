'use client';

import { useState } from 'react';

export function useMultiPlatformPublish({ message, mediaFiles, youtubeConfig }) {
  const [status, setStatus] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const publish = async (selectedPlatforms) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setStatus([{ platform: 'auth', success: false, error: 'You must be logged in.' }]);
      return;
    }

    setIsPublishing(true);
    setStatus([]);

    const platformRequests = selectedPlatforms.map(async (platform) => {
      try {
        if (platform === 'facebook') {
          const formData = new FormData();
          formData.append('message', message); // Append the message field

          // Conditionally append media files if they exist
          if (mediaFiles && mediaFiles.length > 0) {
            mediaFiles.forEach((file) => formData.append('media', file));
          }

          const res = await fetch('http://localhost:8080/api/facebook/post', {
            method: 'POST',
            // IMPORTANT: DO NOT set 'Content-Type' header when sending FormData.
            // The browser will automatically set it to 'multipart/form-data' with the correct boundary.
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData, // Send the FormData object
          });

          if (!res.ok) {
            const errorBody = await res.text(); // Read the raw response body for detailed errors from backend
            throw new Error(`Facebook posting failed: ${res.status} - ${errorBody}`);
          }
        }

        if (platform === 'instagram') {
          const formData = new FormData();
          formData.append('caption', message);
          // Ensure mediaFiles are appended if Instagram requires them
          if (mediaFiles && mediaFiles.length > 0) {
              mediaFiles.forEach((file) => formData.append('media', file));
          }


          const res = await fetch('http://localhost:8080/api/instagram/post', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Instagram posting failed: ${res.status} - ${errorBody}`);
          }
        }

        if (platform === 'youtube') {
          const formData = new FormData();
          formData.append('title', youtubeConfig.title);
          formData.append('description', youtubeConfig.description);
          // Ensure mediaFiles are appended if YouTube requires them (e.g., as 'video')
          if (mediaFiles && mediaFiles.length > 0) {
              mediaFiles.forEach((file) => formData.append('video', file)); // Assuming YouTube expects 'video' key
          }

          const res = await fetch('http://localhost:8080/api/youtube/post', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`YouTube posting failed: ${res.status} - ${errorBody}`);
          }
        }

        return { platform, success: true };
      } catch (err) {
        // Log the full error for better debugging in development
        console.error(`Error publishing to ${platform}:`, err);
        return { platform, success: false, error: err.message };
      }
    });

    const results = await Promise.all(platformRequests);
    setStatus(results);
    setIsPublishing(false);
  };

  return {
    publish,
    status,
    isPublishing,
  };
}