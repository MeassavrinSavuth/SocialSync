'use client';

export function useMultiPlatformPublish({ message, mediaFiles, youtubeConfig }) {
  const publish = async (platforms) => {
    const token = localStorage.getItem('accessToken');
    const results = [];

    for (const platform of platforms) {
      try {
        if (platform === 'facebook') {
          const res = await fetch('http://localhost:8080/api/facebook/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message, mediaUrls: mediaFiles }),
          });

          if (!res.ok) throw new Error('Facebook posting failed');
          results.push({ platform, success: true });

        } else if (platform === 'instagram') {
          const res = await fetch('http://localhost:8080/api/instagram/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ caption: message, mediaUrls: mediaFiles }),
          });

          if (!res.ok) throw new Error('Instagram posting failed');
          results.push({ platform, success: true });

        } else if (platform === 'youtube') {
          const res = await fetch('http://localhost:8080/api/youtube/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: youtubeConfig.title,
              description: youtubeConfig.description,
              mediaUrls: mediaFiles,
            }),
          });

          if (!res.ok) throw new Error('YouTube posting failed');
          results.push({ platform, success: true });

        } else {
          results.push({ platform, success: false, error: 'Unsupported platform' });
        }
      } catch (err) {
        results.push({ platform, success: false, error: err.message });
      }
    }

    return results;
  };

  return { publish };
}
