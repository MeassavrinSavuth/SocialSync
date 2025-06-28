'use client';

export function useMultiPlatformPublish({ message, mediaFiles, youtubeConfig }) {
  const publish = async (platforms) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return platforms.map(p => ({ platform: p, success: false, error: 'Missing token' }));

    const results = [];

    for (const platform of platforms) {
      try {
        let res;
        let payload;

        switch (platform) {
          case 'facebook':
            payload = { message, mediaUrls: mediaFiles };
            res = await fetch('http://localhost:8080/api/facebook/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
            break;

          case 'instagram':
            payload = { caption: message, mediaUrls: mediaFiles };
            res = await fetch('http://localhost:8080/api/instagram/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
            break;

          case 'youtube':
            payload = {
              title: youtubeConfig.title,
              description: youtubeConfig.description,
              mediaUrls: mediaFiles,
            };
            res = await fetch('http://localhost:8080/api/youtube/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
            break;

          default:
            results.push({ platform, success: false, error: 'Unsupported platform' });
            continue;
        }

        const responseData = await res.json().catch(() => ({}));

        if (!res.ok) {
          results.push({
            platform,
            success: false,
            error: responseData?.error || res.statusText || 'Unknown error',
          });
        } else {
          results.push({ platform, success: true, data: responseData });
        }

      } catch (err) {
        results.push({ platform, success: false, error: err.message });
      }
    }

    return results;
  };

  return { publish };
}
