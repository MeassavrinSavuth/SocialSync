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

function AppIconCard({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className={`text-4xl mb-2 ${color}`}>{icon}</div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </button>
  );
}

export default function PostsFolderPage() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
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
    
    // Redirect to the appropriate auth endpoint
    if (platform === 'facebook') {
      window.location.href = `http://localhost:8080/auth/facebook/login?token=${token}`;
    } else if (platform === 'twitter') {
      window.location.href = `http://localhost:8080/auth/twitter/login?token=${token}`;
    } else if (platform === 'youtube') {
      window.location.href = `http://localhost:8080/auth/youtube/login?token=${token}`;
    } else if (platform === 'instagram') {
      window.location.href = `http://localhost:8080/auth/instagram/login?token=${token}`;
    } else if (platform === 'mastodon') {
      window.location.href = `http://localhost:8080/auth/mastodon/login?token=${token}`;
    }
  };

  // Update the fetch function to handle connection errors
  const fetchPlatformPosts = async (platform) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await protectedFetch(`http://localhost:8080/api/${platform}/posts`);
      if (!res) return;
      
      const data = await res.json();
      
      // Check if response indicates need for reconnection
      if (data.needsReconnect) {
        setConnectionStatus(prev => ({
          ...prev,
          [platform]: {
            isConnected: false,
            error: data,
            needsReconnect: true
          }
        }));
        setError(null); // Clear general error since we have specific connection error
        return;
      }
      
      // Update connection status to success
      setConnectionStatus(prev => ({
        ...prev,
        [platform]: {
          isConnected: true,
          error: null,
          needsReconnect: false
        }
      }));
      
      // Handle different response formats
      if (platform === 'facebook') {
        setFacebookPosts(data.data || []);
        setFacebookPageInfo(data.pageInfo || null);
      } else if (platform === 'twitter') {
        setTwitterPosts(data);
      } else if (platform === 'youtube') {
        setYouTubePosts(data.items || []);
      } else if (platform === 'mastodon') {
        setMastodonPosts(data);
      } else if (platform === 'instagram') {
        setInstagramPosts(data.data || []);
      }
      
    } catch (err) {
      console.error(`Error fetching ${platform} posts:`, err);
      setError(`Failed to fetch ${platform} posts: ${err.message}`);
      setConnectionStatus(prev => ({
        ...prev,
        [platform]: {
          isConnected: false,
          error: { message: err.message },
          needsReconnect: false
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPlatform) {
      fetchPlatformPosts(selectedPlatform);
    }
  }, [selectedPlatform]);

  const handlePlatformClick = (platform) => {
    setSelectedPlatform(platform);
    setMastodonPosts([]);
    setTwitterPosts([]);
    setYouTubePosts([]);
    setFacebookPosts([]);
    setFacebookPageInfo(null);
    setInstagramPosts([]);
    setError(null);
    setSearchQuery('');
    // Clear connection status for new platform
    setConnectionStatus(prev => ({
      ...prev,
      [platform]: {
        isConnected: true,
        error: null,
        needsReconnect: false
      }
    }));
  };

  // Filter posts by search query
  const filteredMastodonPosts = mastodonPosts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTwitterPosts = (twitterPosts.data || []).filter(tweet =>
    tweet.text && tweet.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredYouTubePosts = youtubePosts.filter(video => {
    const snippet = video.snippet || {};
    return (
      (snippet.title && snippet.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (snippet.description && snippet.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });
  const filteredFacebookPosts = facebookPosts.filter(post =>
    (post.message && post.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredInstagramPosts = instagramPosts.filter(post =>
    (post.caption && post.caption.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper functions for Twitter
  const getTweetMedia = (tweet, includes) => {
    if (!tweet.attachments || !tweet.attachments.media_keys || !includes || !includes.media) return [];
    return tweet.attachments.media_keys.map(key =>
      includes.media.find(m => m.media_key === key)
    ).filter(Boolean);
  };

  const getTweetAuthor = (twitterPosts) => {
    if (twitterPosts && twitterPosts.includes && twitterPosts.includes.users && twitterPosts.includes.users.length > 0) {
      return twitterPosts.includes.users[0];
    }
    if (twitterPosts && twitterPosts.data && twitterPosts.data.length > 0 && twitterPosts.data[0].author) {
      return twitterPosts.data[0].author;
    }
    return null;
  };
  const tweetAuthor = getTweetAuthor(twitterPosts);

  // Render connection status or posts
  const renderContent = () => {
    if (!selectedPlatform) return null;
    
    const status = connectionStatus[selectedPlatform];
    
    // Show connection status if there are issues
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

    // Show posts based on selected platform
    switch (selectedPlatform) {
      case 'mastodon':
        return (
          <MastodonPosts
            posts={filteredMastodonPosts}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'twitter':
        return (
          <TwitterPosts
            posts={filteredTwitterPosts}
            includes={twitterPosts.includes}
            tweetAuthor={tweetAuthor}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
        Select platform to see the post
      </h1>
      <div className="flex gap-6 justify-center my-6 flex-wrap">
        <AppIconCard icon={<FaFacebook />} label="Facebook" color="text-blue-600" onClick={() => handlePlatformClick('facebook')} />
        <AppIconCard icon={<FaInstagram />} label="Instagram" color="text-pink-500" onClick={() => handlePlatformClick('instagram')} />
        <AppIconCard icon={<FaYoutube />} label="YouTube" color="text-red-600" onClick={() => handlePlatformClick('youtube')} />
        <AppIconCard icon={<SiMastodon />} label="Mastodon" color="text-purple-600" onClick={() => handlePlatformClick('mastodon')} />
        <AppIconCard icon={<FaTwitter />} label="Twitter" color="text-sky-500" onClick={() => handlePlatformClick('twitter')} />
      </div>
      {selectedPlatform && (
        <div className="text-center text-lg mt-4">
          Selected platform: <span className="font-semibold capitalize">{selectedPlatform}</span>
        </div>
      )}
      
      {renderContent()}
    </div>
  );
}
