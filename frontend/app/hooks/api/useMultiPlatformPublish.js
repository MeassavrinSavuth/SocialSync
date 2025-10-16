export function useMultiPlatformPublish({ message, mediaFiles, youtubeConfig }) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';
  const publish = async (platforms, accountsByProvider = {}) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return platforms.map((p) => ({
        platform: p,
        success: false,
        error: 'Missing token',
      }));
    }

    const results = [];

    for (const platform of platforms) {
      try {
        let res;

        switch (platform) {
          case 'facebook':
            // Facebook expects JSON: { message, mediaUrls: [...] }
            const facebookPayload = {
              message,
              mediaUrls: mediaFiles,
              accountIds: accountsByProvider?.facebook?.ids || [],
              all: !!accountsByProvider?.facebook?.all,
            };
            console.log('DEBUG: Facebook payload:', facebookPayload);
            res = await fetch(`${API_BASE_URL}/api/facebook/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(facebookPayload),
            });
            break;

          case 'instagram':
            // Instagram expects JSON: { caption, mediaUrls: [...] }
            const instagramPayload = {
              caption: message,
              mediaUrls: mediaFiles,
              accountIds: accountsByProvider?.instagram?.ids || [],
              all: !!accountsByProvider?.instagram?.all,
            };
            console.log('DEBUG: Instagram payload:', instagramPayload);
            res = await fetch(`${API_BASE_URL}/api/instagram/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(instagramPayload),
            });
            break;

          case 'twitter':
            // Twitter expects JSON: { text, mediaUrls: [...], accountIds: [...] }
            const twitterPayload = {
              text: message,
              mediaUrls: mediaFiles,
              accountIds: accountsByProvider?.twitter?.ids || [],
            };
            console.log('DEBUG: Twitter payload:', twitterPayload);
            res = await fetch(`${API_BASE_URL}/api/twitter/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(twitterPayload),
            });
            break;

          case 'youtube':
            if (!mediaFiles || mediaFiles.length === 0) {
              results.push({ platform, success: false, error: 'No video file provided' });
              continue;
            }

            const formData = new FormData();
            formData.append('video', await fetch(mediaFiles[0]).then((r) => r.blob()), 'video.mp4');
            formData.append('title', youtubeConfig.title || '');
            formData.append('description', youtubeConfig.description || '');
            formData.append('tags', youtubeConfig.tags?.join(',') || '');
            formData.append('privacy', youtubeConfig.privacy || 'private');
            formData.append('category_id', youtubeConfig.categoryId || '22');

            // Account routing
            const ytIds = accountsByProvider?.youtube?.ids || [];
            if (ytIds.length > 0) {
              ytIds.forEach((id) => formData.append('accountIds', id));
            } else if (accountsByProvider?.youtube?.all) {
              formData.append('all', 'true');
            }

            res = await fetch(`${API_BASE_URL}/api/youtube/post`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
            break;

          case 'mastodon': {
            // Mastodon expects JSON: { status, mediaUrls: [...], accountIds: [...] }
            const mastodonPayload = {
              status: message,
              mediaUrls: mediaFiles,
              accountIds: accountsByProvider?.mastodon?.ids || [],
            };
            console.log('DEBUG: Mastodon payload:', mastodonPayload);
            res = await fetch(`${API_BASE_URL}/api/mastodon/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(mastodonPayload),
            });
            break;
          }

          case 'telegram':
            // Telegram expects JSON: { message, mediaUrls, accountIds, all }
            res = await fetch(`${API_BASE_URL}/api/telegram/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                message,
                mediaUrls: mediaFiles,
                accountIds: accountsByProvider?.telegram?.ids || [],
                all: !!accountsByProvider?.telegram?.all,
              }),
            });
            break;

          default:
            results.push({ platform, success: false, error: 'Unsupported platform' });
            continue;
        }

        const responseData = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Handle all error responses consistently
          const errorInfo = {
            platform,
            success: false,
            error: responseData?.error || res.statusText || 'Unknown error',
          };

          // Check if this is a structured error response with type and action
          if (responseData?.type && responseData?.action) {
            errorInfo.errorType = responseData.type;
            errorInfo.errorAction = responseData.action;
            errorInfo.userFriendlyMessage = responseData.userMessage || responseData.error;
          }

          results.push(errorInfo);
        } else {
          // Handle platforms that return results arrays (Facebook, Instagram, Mastodon, Twitter, YouTube)
          if ((platform === 'facebook' || platform === 'instagram' || platform === 'mastodon' || platform === 'twitter' || platform === 'youtube') && responseData.results) {
            // Check if all posts were successful
            const allSuccessful = responseData.results.every(result => result.ok === true);
            const failedResults = responseData.results.filter(result => result.ok === false);
            
            if (allSuccessful) {
              results.push({ platform, success: true, data: responseData });
            } else {
              // Some or all posts failed
              const errorMessages = failedResults.map(result => {
                const accountId = result.accountId || 'Unknown account';
                return `${accountId}: ${result.error || 'Unknown error'}`;
              }).join('; ');
              
              results.push({ 
                platform, 
                success: false, 
                error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} posting failed: ${errorMessages}`,
                data: responseData 
              });
            }
          } else {
            results.push({ platform, success: true, data: responseData });
          }
        }
      } catch (err) {
        results.push({ platform, success: false, error: err.message });
      }
    }

    return results;
  };

  return { publish };
}