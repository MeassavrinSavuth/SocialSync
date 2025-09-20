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
      className="group flex flex-col items-center justify-center bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[80px] md:min-h-[100px] lg:min-h-[120px] w-full"
    >
      <div className={`text-2xl md:text-3xl lg:text-4xl mb-1 md:mb-2 ${color}`}>{icon}</div>
      <span className="text-xs md:text-sm font-semibold text-gray-700">{label}</span>
    </button>
  );
}

export default function PostsFolderPage() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [mastodonPosts, setMastodonPosts] = useState([]);
  const [twitterPosts, setTwitterPosts] = useState([]);
  const [youtubePosts, setYouTubePosts] = useState([]);
  const [facebookPosts, setFacebookPosts] = useState([]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
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

    if (platform === 'facebook') {
      window.location.href = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
    } else if (platform === 'twitter') {
      window.location.href = `${API_BASE_URL}/auth/twitter/login?token=${token}`;
    } else if (platform === 'youtube') {
      window.location.href = `${API_BASE_URL}/auth/youtube/login?token=${token}`;
    } else if (platform === 'instagram') {
      window.location.href = `${API_BASE_URL}/auth/instagram/login?token=${token}`;
    } else if (platform === 'mastodon') {
      window.location.href = `${API_BASE_URL}/auth/mastodon/login?token=${token}`;
    }
  };

  // Fetch posts for a platform
  const fetchPlatformPosts = async (platform) => {
    setLoading(true);
    setError(null);

    try {
      // Call the backend API directly (use API_BASE_URL) so requests go to the server
      // Example: https://socialsync-j7ih.onrender.com/api/youtube/posts
      const res = await protectedFetch(`${API_BASE_URL}/api/${platform}/posts`);
      if (!res) return;

      let payload = null;
      try {
        payload = await res.json();
      } catch (jsonErr) {
        console.warn('Failed to parse JSON from', platform, jsonErr);
      }

      console.debug('fetchPlatformPosts', platform, 'status', res.status, 'payload', payload);

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
        setFacebookPosts(payload.data || []);
        setFacebookPageInfo(payload.pageInfo || null);
      } else if (platform === 'twitter') {
        setTwitterPosts(payload);
      } else if (platform === 'youtube') {
        setYouTubePosts(payload.items || []);
      } else if (platform === 'mastodon') {
        setMastodonPosts(payload);
      } else if (platform === 'instagram') {
        setInstagramPosts(payload.data || []);
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
    setConnectionStatus((prev) => ({
      ...prev,
      [platform]: {
        isConnected: true,
        error: null,
        needsReconnect: false,
      },
    }));
  };

  // Filter posts by search query
  const filteredMastodonPosts = mastodonPosts.filter((post) =>
    post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTwitterPosts = (twitterPosts.data || []).filter(
    (tweet) =>
      tweet.text && tweet.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredYouTubePosts = youtubePosts.filter((video) => {
    const snippet = video.snippet || {};
    return (
      (snippet.title &&
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (snippet.description &&
        snippet.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });
  const filteredFacebookPosts = facebookPosts.filter(
    (post) =>
      post.message && post.message.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredInstagramPosts = instagramPosts.filter(
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
    <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6 text-center">
        Select platform to see the post
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6 my-4 md:my-6 justify-items-center">
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
      {selectedPlatform && (
        <div className="text-center text-sm md:text-base lg:text-lg mt-3 md:mt-4 mb-4 md:mb-6">
          Selected platform:{' '}
          <span className="font-semibold capitalize text-blue-600">{selectedPlatform}</span>
        </div>
      )}
      <div className="mt-4 md:mt-6">
        {renderContent()}
      </div>
    </div>
  );
}
