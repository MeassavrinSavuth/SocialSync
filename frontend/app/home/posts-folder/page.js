'use client';
import React, { useState, useEffect } from 'react';
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';
import MastodonPosts from '../../components/postfolder/MastodonPosts';
import TwitterPosts from '../../components/postfolder/TwitterPosts';
import YouTubePosts from '../../components/postfolder/YouTubePosts';
import FacebookPosts from '../../components/postfolder/FacebookPosts';
import InstagramPosts from '../../components/postfolder/InstagramPosts';
import ConnectionStatus from '../../components/ConnectionStatus';
import AccountSelector from '../../components/AccountSelector';

function AppIconCard({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[80px] md:min-h-[100px] lg:min-h-[120px] w-full"
    >
      <div className={`text-2xl md:text-3xl lg:text-4xl mb-1 md:mb-2 ${color}`}>{icon}</div>
      <span className="text-xs md:text-sm font-semibold text-gray-700">{label}</span>
    </button>
  );
}

export default function PostsFolderPage() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]); // Multi-account selection
  const [mastodonPosts, setMastodonPosts] = useState([]);
  const [twitterPosts, setTwitterPosts] = useState([]);
  const [youtubePosts, setYouTubePosts] = useState([]);
  const [facebookPosts, setFacebookPosts] = useState([]);
  const [facebookPageInfo, setFacebookPageInfo] = useState(null);
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({});
  const protectedFetch = useProtectedFetch();

  // Handle reconnection to social media platforms
  const handleReconnect = (platform) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';
    if (platform === 'facebook') {
      window.location.href = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
    } else if (platform === 'twitter') {
      window.location.href = `${API_BASE_URL}/auth/twitter/login?token=${token}`;
    } else if (platform === 'youtube') {
      window.location.href = `${API_BASE_URL}/auth/youtube/login?token=${token}`;
    } else if (platform === 'instagram') {
      // Instagram requires Facebook connection first, redirect to manage accounts
      window.location.href = `/home/manage-accounts`;
    } else if (platform === 'mastodon') {
      window.location.href = `${API_BASE_URL}/auth/mastodon/login?token=${token}`;
    }
  };

  // Fetch posts for a platform and specific account
  const fetchPlatformPosts = async (platform, account = null) => {
    setLoading(true);
    setError(null);

    try {
      // Validate account object
      if (account && !account.id) {
        console.error('Invalid account object - missing id:', account);
        setError('Invalid account selected');
        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: {
            isConnected: false,
            error: { message: 'Invalid account selected. Please try reconnecting.' },
            needsReconnect: false,
          },
        }));
        setLoading(false);
        return;
      }

      // Build API URL with account parameter if provided
      let apiUrl = `/${platform}/posts`;
      if (account && account.id) {
        apiUrl += `?accountId=${account.id}`;
      }
      
      // Call the backend API using relative path
      let payload;
      try {
        payload = await protectedFetch(apiUrl);
      } catch (fetchError) {
        console.error('Error fetching posts for', platform, 'account', account, ':', fetchError);
        
        // Handle specific error cases
        if (fetchError.message && fetchError.message.includes('401')) {
          setConnectionStatus((prev) => ({
            ...prev,
            [platform]: {
              isConnected: false,
              error: { message: 'Access token expired. Please reconnect your account.' },
              needsReconnect: true,
            },
          }));
          return;
        } else if (fetchError.message && fetchError.message.includes('400')) {
          setConnectionStatus((prev) => ({
            ...prev,
            [platform]: {
              isConnected: false,
              error: { message: 'Account connection issue. Please check your account settings.' },
              needsReconnect: true,
            },
          }));
          return;
        } else if (fetchError.message && fetchError.message.includes('500')) {
          setConnectionStatus((prev) => ({
            ...prev,
            [platform]: {
              isConnected: false,
              error: { message: 'Server error. Please try again or reconnect your account.' },
              needsReconnect: true,
            },
          }));
          return;
        } else {
          setConnectionStatus((prev) => ({
            ...prev,
            [platform]: {
              isConnected: false,
              error: { message: fetchError.message || 'Failed to fetch posts' },
              needsReconnect: false,
            },
          }));
          return;
        }
      }
      
      if (!payload) {
        console.error('No payload returned for', platform, 'account', account);
        return;
      }

      console.debug('fetchPlatformPosts', platform, 'account', account, 'payload', payload);

      if (!payload) {
        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: {
            isConnected: false,
            error: { message: 'No data returned' },
            needsReconnect: false,
          },
        }));
        return;
      }

      if (payload.needsReconnect) {
        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: {
            isConnected: false,
            error: payload,
            needsReconnect: true,
          },
        }));
        return;
      }

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: {
          isConnected: true,
          error: null,
          needsReconnect: false,
        },
      }));

      // Handle platform-specific data structures
      if (platform === 'facebook') {
        // Add account metadata for single account case
        const postsArray = Array.isArray(payload) ? payload : (payload?.data || []);
        const postsWithAccount = postsArray.map(post => ({
          ...post,
          _accountId: account?.id,
          _accountName: account?.displayName || account?.profileName || account?.externalId || 'Facebook Page',
          _accountAvatar: account?.avatar
        }));
        setFacebookPosts(postsWithAccount);
        setFacebookPageInfo(payload.pageInfo || null);
      } else if (platform === 'twitter') {
        // Add account metadata for single account case
        // Twitter API returns data in different structures, handle both cases
        console.log('Twitter payload structure:', typeof payload, Array.isArray(payload), payload);
        const twitterData = payload.data || payload || [];
        console.log('Twitter data after extraction:', typeof twitterData, Array.isArray(twitterData), twitterData);
        const postsWithAccount = (Array.isArray(twitterData) ? twitterData : []).map(post => ({
          ...post,
          _accountId: account?.id,
          _accountName: account?.displayName || account?.profileName || account?.externalId || 'Twitter Account',
          _accountAvatar: account?.avatar
        }));
        setTwitterPosts(postsWithAccount);
      } else if (platform === 'youtube') {
        // Add account metadata for single account case
        const postsArray = Array.isArray(payload) ? payload : (payload?.items || []);
        const postsWithAccount = postsArray.map(post => ({
          ...post,
          _accountId: account?.id,
          _accountName: account?.displayName || account?.profileName || account?.externalId || 'YouTube Channel',
          _accountAvatar: account?.avatar
        }));
        setYouTubePosts(postsWithAccount);
      } else if (platform === 'mastodon') {
        // Add account metadata for single account case
        const postsArray = Array.isArray(payload) ? payload : (payload?.posts || payload?.data || []);
        const postsWithAccount = postsArray.map(post => ({
          ...post,
          _accountId: account?.id,
          _accountName: account?.displayName || account?.profileName || account?.externalId || 'Mastodon Account',
          _accountAvatar: account?.avatar
        }));
        setMastodonPosts(postsWithAccount);
      } else if (platform === 'instagram') {
        // Add account metadata for single account case
        const postsArray = Array.isArray(payload) ? payload : (payload?.data || []);
        const postsWithAccount = postsArray.map(post => ({
          ...post,
          _accountId: account?.id,
          _accountName: account?.displayName || account?.profileName || account?.externalId || 'Instagram Account',
          _accountAvatar: account?.avatar
        }));
        setInstagramPosts(postsWithAccount);
      }
    } catch (err) {
      console.error(`Error fetching ${platform} posts:`, err);
      setError(`Failed to fetch ${platform} posts: ${err.message}`);
      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: {
          isConnected: false,
          error: { message: err.message },
          needsReconnect: false,
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts from multiple accounts and aggregate them
  const fetchPostsFromMultipleAccounts = async (platform, accounts) => {
    console.log('DEBUG: fetchPostsFromMultipleAccounts called with:', { platform, accounts });
    
    setLoading(true);
    setError(null);

    try {
      // Validate accounts array
      if (!accounts || accounts.length === 0) {
        console.error('No accounts provided to fetchPostsFromMultipleAccounts');
        setError('No accounts selected');
        setLoading(false);
        return;
      }

      // Filter out invalid accounts (missing id)
      const validAccounts = accounts.filter(account => account && account.id);
      if (validAccounts.length === 0) {
        console.error('No valid accounts with IDs found:', accounts);
        setError('Invalid account selection. Please try reconnecting your accounts.');
        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: {
            isConnected: false,
            error: { message: 'Invalid account configuration. Please reconnect.' },
            needsReconnect: true,
          },
        }));
        setLoading(false);
        return;
      }

      // If only one account, use the original single-account method
      if (validAccounts.length === 1) {
        console.log('Single account detected, using fetchPlatformPosts');
        await fetchPlatformPosts(platform, validAccounts[0]);
        return;
      }

      const allPosts = [];
      const allPageInfo = [];
      let hasError = false;
      let successfulAccounts = 0;

      // Fetch posts from each selected account
      for (const account of validAccounts) {
        try {
          const apiUrl = `/${platform}/posts?accountId=${account.id}`;
          console.log(`Fetching posts for account ${account.id} from ${apiUrl}`);
          let payload;
          try {
            payload = await protectedFetch(apiUrl);
          } catch (fetchError) {
            console.error(`Error fetching posts for account ${account.id}:`, fetchError);
            
            // Handle specific error cases
            if (fetchError.message && fetchError.message.includes('401')) {
              console.log(`Account ${account.id} has expired token, skipping`);
              hasError = true;
              continue;
            } else if (fetchError.message && fetchError.message.includes('400')) {
              console.log(`Account ${account.id} has connection issue, skipping`);
              hasError = true;
              continue;
            } else if (fetchError.message && fetchError.message.includes('500')) {
              console.log(`Account ${account.id} failed with server error:`, fetchError.message);
              hasError = true;
              continue;
            } else {
              console.log(`Account ${account.id} failed with error:`, fetchError.message);
              hasError = true;
              continue;
            }
          }
          
          if (payload && !payload.needsReconnect) {
            // Add account info to each post for identification
            console.log('Account data for', account.id, ':', {
              displayName: account.displayName,
              profileName: account.profileName,
              externalId: account.externalId,
              provider: account.provider,
              platform: account.platform,
              avatar: account.avatar,
              fullAccount: account
            });
            
            // Handle different API response structures for each platform
            let postsData = [];
            if (platform === 'facebook') {
              postsData = payload.data || [];
            } else if (platform === 'twitter') {
              postsData = payload.data || payload || [];
            } else if (platform === 'telegram') {
              postsData = payload.data || payload || [];
            } else if (platform === 'youtube') {
              postsData = payload.items || [];
            } else if (platform === 'mastodon') {
              postsData = payload.posts || payload.data || payload || [];
            } else if (platform === 'instagram') {
              postsData = payload.data || [];
            }
            
            const postsWithAccount = (Array.isArray(postsData) ? postsData : []).map(post => ({
              ...post,
              _accountId: account.id,
              _accountName: account.displayName || account.profileName || account.externalId,
              _accountAvatar: account.avatar,
              _accountUsername: account.username || account.profileName
            }));
            
            console.log(`Posts for account ${account.id} (${account.displayName || account.profileName || account.externalId}):`, postsWithAccount.length, 'posts');
            if (postsWithAccount.length > 0) {
              console.log('First post account metadata:', {
                _accountId: postsWithAccount[0]._accountId,
                _accountName: postsWithAccount[0]._accountName,
                _accountAvatar: postsWithAccount[0]._accountAvatar
              });
            }
            
            allPosts.push(...postsWithAccount);
            successfulAccounts++;
            
            // Handle page info for Facebook
            if (platform === 'facebook' && payload.pageInfo) {
              allPageInfo.push({
                ...payload.pageInfo,
                _accountId: account.id,
                _accountName: account.displayName || account.profileName || account.externalId
              });
            }
          } else if (payload && payload.needsReconnect) {
            console.warn(`Account ${account.id} needs reconnection`);
            hasError = true;
          }
        } catch (err) {
          console.error(`Error fetching posts for account ${account.id}:`, err);
          hasError = true;
          
          // If this is a 500 error, try fallback to single account method
          if (err.message && err.message.includes('500')) {
            console.log('500 error detected, falling back to single account method');
            try {
              await fetchPlatformPosts(platform, account);
              return;
            } catch (fallbackErr) {
              console.error('Fallback also failed:', fallbackErr);
            }
          }
        }
      }

      // If no accounts succeeded, try the original method without accountId
      if (successfulAccounts === 0) {
        console.log('No accounts succeeded, trying original method');
        await fetchPlatformPosts(platform, null);
        return;
      }

      // Sort posts by creation time (newest first)
      console.log(`DEBUG: Sorting ${allPosts.length} posts for platform ${platform}`);
      allPosts.sort((a, b) => {
        // Handle different timestamp fields for different platforms
        let timeA, timeB;
        
        if (platform === 'youtube') {
          // YouTube uses snippet.publishedAt
          timeA = new Date(a.snippet?.publishedAt || 0);
          timeB = new Date(b.snippet?.publishedAt || 0);
        } else if (platform === 'facebook') {
          // Facebook uses created_time
          timeA = new Date(a.created_time || 0);
          timeB = new Date(b.created_time || 0);
        } else if (platform === 'instagram') {
          // Instagram uses timestamp
          timeA = new Date(a.timestamp || 0);
          timeB = new Date(b.timestamp || 0);
        } else if (platform === 'mastodon') {
          // Mastodon uses created_at
          timeA = new Date(a.created_at || 0);
          timeB = new Date(b.created_at || 0);
        } else if (platform === 'twitter') {
          // Twitter uses created_at
          timeA = new Date(a.created_at || 0);
          timeB = new Date(b.created_at || 0);
        } else if (platform === 'telegram') {
          // Telegram uses date
          timeA = new Date(a.date || 0);
          timeB = new Date(b.date || 0);
        } else {
          // Default fallback
          timeA = new Date(a.created_at || a.created_time || a.timestamp || a.publishedAt || 0);
          timeB = new Date(b.created_at || b.created_time || b.timestamp || b.publishedAt || 0);
        }
        
        return timeB - timeA; // Newest first
      });
      
      // Debug: Log first few posts with their timestamps
      console.log(`DEBUG: First 3 posts after sorting:`);
      allPosts.slice(0, 3).forEach((post, index) => {
        let timestamp;
        if (platform === 'youtube') {
          timestamp = post.snippet?.publishedAt;
        } else if (platform === 'facebook') {
          timestamp = post.created_time;
        } else if (platform === 'instagram') {
          timestamp = post.timestamp;
        } else if (platform === 'mastodon') {
          timestamp = post.created_at;
        } else if (platform === 'twitter') {
          timestamp = post.created_at;
        } else {
          timestamp = post.created_at || post.created_time || post.timestamp || post.publishedAt;
        }
        const accountName = post._accountName || 'Unknown Account';
        console.log(`  ${index + 1}. [${accountName}] ${post.snippet?.title || post.text || post.message || post.caption || post.content?.substring(0, 50) || 'No title'} - ${timestamp}`);
      });

      // Set the aggregated posts
      if (platform === 'facebook') {
        setFacebookPosts(allPosts);
        setFacebookPageInfo(allPageInfo);
      } else if (platform === 'twitter') {
        setTwitterPosts(allPosts);
      } else if (platform === 'youtube') {
        setYouTubePosts(allPosts);
      } else if (platform === 'mastodon') {
        setMastodonPosts(allPosts);
      } else if (platform === 'instagram') {
        setInstagramPosts(allPosts);
      }

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: {
          isConnected: true,
          error: hasError ? { message: `Only ${successfulAccounts} of ${accounts.length} accounts loaded successfully` } : null,
          needsReconnect: false,
        },
      }));

    } catch (err) {
      console.error(`Error fetching posts from multiple accounts:`, err);
      setError(`Failed to fetch posts from multiple accounts: ${err.message}`);
      
      // Final fallback - try original method
      try {
        console.log('Attempting final fallback to original method');
        await fetchPlatformPosts(platform, null);
      } catch (fallbackErr) {
        console.error('Final fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear posts immediately when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      // Clear all posts when platform changes
      setMastodonPosts([]);
      setTwitterPosts([]);
      setYouTubePosts([]);
      setFacebookPosts([]);
      setFacebookPageInfo(null);
      setInstagramPosts([]);
      setError(null);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    if (selectedPlatform && selectedAccounts.length > 0) {
      console.log('Fetching posts for platform:', selectedPlatform, 'with accounts:', selectedAccounts);
      // Fetch posts from all selected accounts
      fetchPostsFromMultipleAccounts(selectedPlatform, selectedAccounts);
    }
  }, [selectedPlatform, selectedAccounts]);

  const handlePlatformClick = (platform) => {
    setSelectedPlatform(platform);
    setSelectedAccounts([]); // Reset account selection - will be auto-selected by AccountSelector
    setSearchQuery('');
    setConnectionStatus((prev) => ({
      ...prev,
      [platform]: {
        isConnected: true,
        error: null,
        needsReconnect: false,
      },
    }));
  };

  const handleAccountSelect = (accountObjects) => {
    // Always multi-select mode: accountObjects is an array of account objects
    console.log('handleAccountSelect called with:', accountObjects);
    setSelectedAccounts(accountObjects);
  };

  // Filter posts by search query
  const filteredMastodonPosts = (mastodonPosts || []).filter((post) =>
    post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTwitterPosts = (twitterPosts || []).filter(
    (tweet) =>
      tweet.text && tweet.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredYouTubePosts = (youtubePosts || []).filter((video) => {
    const snippet = video.snippet || {};
    return (
      (snippet.title &&
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (snippet.description &&
        snippet.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });
  const filteredFacebookPosts = (facebookPosts || []).filter(
    (post) =>
      post.message && post.message.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredInstagramPosts = (instagramPosts || []).filter(
    (post) =>
      post.caption && post.caption.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helpers for Twitter
  const getTweetAuthor = (twitterPosts) => {
    if (twitterPosts?.includes?.users?.length > 0) {
      return twitterPosts.includes.users[0];
    }
    if (twitterPosts?.data?.length > 0 && twitterPosts.data[0].author) {
      return twitterPosts.data[0].author;
    }
    return null;
  };
  const tweetAuthor = getTweetAuthor(twitterPosts);

  // Render platform content
  const renderContent = () => {
    if (!selectedPlatform) return null;

    const status = connectionStatus[selectedPlatform];

    if (status && (!status.isConnected || status.error)) {
      return (
        <ConnectionStatus
          platform={selectedPlatform}
          isConnected={status.isConnected}
          error={status.error}
          onReconnect={() => handleReconnect(selectedPlatform)}
          lastConnected={status.lastConnected}
        />
      );
    }

    switch (selectedPlatform) {
      case 'mastodon':
        return (
          <MastodonPosts
            posts={filteredMastodonPosts}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAccounts={selectedAccounts}
          />
        );
      case 'twitter':
        return (
          <TwitterPosts
            posts={filteredTwitterPosts}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAccounts={selectedAccounts}
          />
        );
      case 'youtube':
        return (
          <YouTubePosts
            posts={filteredYouTubePosts}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAccounts={selectedAccounts}
          />
        );
      case 'facebook':
        return (
          <FacebookPosts
            posts={filteredFacebookPosts}
            pageInfo={facebookPageInfo}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'instagram':
        return (
          <InstagramPosts
            posts={filteredInstagramPosts}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAccounts={selectedAccounts}
          />
        );
      default:
        return null;
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook':
        return FaFacebook;
      case 'instagram':
        return FaInstagram;
      case 'youtube':
        return FaYoutube;
      case 'twitter':
        return FaTwitter;
      case 'mastodon':
        return SiMastodon;
      default:
        return null;
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'facebook':
        return 'Facebook';
      case 'instagram':
        return 'Instagram';
      case 'youtube':
        return 'YouTube';
      case 'twitter':
        return 'Twitter (X)';
      case 'mastodon':
        return 'Mastodon';
      default:
        return platform;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Posts Folder</h1>
        <p className="text-base md:text-lg text-gray-600">View posts from your connected social media accounts.</p>
      </div>

      {/* Platform Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Platform</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <AppIconCard
            icon={<FaFacebook />}
            label="Facebook"
            color="text-blue-600"
            onClick={() => handlePlatformClick('facebook')}
          />
          <AppIconCard
            icon={<FaInstagram />}
            label="Instagram"
            color="text-pink-500"
            onClick={() => handlePlatformClick('instagram')}
          />
          <AppIconCard
            icon={<FaYoutube />}
            label="YouTube"
            color="text-red-600"
            onClick={() => handlePlatformClick('youtube')}
          />
          <AppIconCard
            icon={<SiMastodon />}
            label="Mastodon"
            color="text-purple-600"
            onClick={() => handlePlatformClick('mastodon')}
          />
          <AppIconCard
            icon={<FaTwitter />}
            label="Twitter"
            color="text-sky-500"
            onClick={() => handlePlatformClick('twitter')}
          />
        </div>
      </div>

      {/* Account Selection */}
      {selectedPlatform && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Accounts</h2>
          <div className="max-w-md">
            <AccountSelector
              platform={selectedPlatform}
              IconComponent={getPlatformIcon(selectedPlatform)}
              onAccountSelect={handleAccountSelect}
              selectedAccountIds={selectedAccounts.map(acc => acc.id)}
              multiSelect={true}
            />
          </div>
        </div>
      )}

      {/* Posts Content */}
      {selectedPlatform && selectedAccounts.length > 0 && (
        <div className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Posts from {selectedAccounts.length} {getPlatformName(selectedPlatform)} Account{selectedAccounts.length > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedAccounts.map(acc => acc.displayName || acc.profileName || acc.externalId).join(', ')}
            </p>
          </div>
          {renderContent()}
        </div>
      )}
    </div>
  );
}
