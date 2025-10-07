'use client';

import { useState } from 'react';
import PostEditor from '../../components/PostEditor';
import PostPreview from '../../components/PostPreview';
import PostQueue from '../../components/PostQueue';
import AuthErrorModal from '../../components/AuthErrorModal';
import { useMultiPlatformPublish } from '../../hooks/api/useMultiPlatformPublish';
import { useScheduledPosts } from '../../hooks/api/useScheduledPosts';

// Define the list of platforms here, now including Telegram
const platformsList = ['facebook', 'instagram', 'youtube', 'twitter', 'mastodon', 'telegram'];

export default function CreatePostPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [accountsByProvider, setAccountsByProvider] = useState({});
  const [message, setMessage] = useState('');
  const [youtubeConfig, setYoutubeConfig] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState([]); // array of Cloudinary URLs
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [status, setStatus] = useState(null); // { success: bool, message: string }
  const [postQueue, setPostQueue] = useState([]);
  const [authErrors, setAuthErrors] = useState([]); // For authentication errors
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const { publish } = useMultiPlatformPublish({
    message,
    mediaFiles,
    youtubeConfig,
  });

  const { createScheduledPost } = useScheduledPosts();

  const handleReconnect = (platform) => {
    // Close the modal
    setShowAuthErrorModal(false);
    setAuthErrors([]);
    
    // This function will be called by the AuthErrorModal component
    // The actual redirection is handled in the modal component
  };

  // Handle immediate posting (Post Now)
  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      setStatus({ success: false, message: 'Please select at least one platform.' });
      return;
    }
    setIsPublishing(true);
    setStatus(null);

    const newQueueItems = selectedPlatforms.map(platform => ({
      id: Date.now() + Math.random(),
      platform: platform,
      status: 'pending',
      timestamp: new Date().toISOString(),
      messageSnippet: message.substring(0, 50) + '...',
      mediaCount: mediaFiles.length,
    }));
    setPostQueue(prev => [...prev, ...newQueueItems]);

    try {
      const results = await publish(selectedPlatforms, accountsByProvider);
      
      // Separate successful results from errors
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      // Check for authentication errors that require reconnection
      const authErrorResults = failedResults.filter(r => 
        r.errorType === 'AUTH_EXPIRED' && r.errorAction === 'RECONNECT_REQUIRED'
      );
      
      // Other errors that don't require reconnection
      const otherErrors = failedResults.filter(r => 
        !(r.errorType === 'AUTH_EXPIRED' && r.errorAction === 'RECONNECT_REQUIRED')
      );

      if (successfulResults.length === selectedPlatforms.length) {
        // All succeeded
        setStatus({ success: true, message: 'All posts published successfully!' });
        // Clear form after successful immediate posting
        setMessage('');
        setMediaFiles([]);
        setSelectedPlatforms([]);
        // Clear the post queue after a delay to show success status
        setTimeout(() => {
          setPostQueue([]);
        }, 3000); // Clear after 3 seconds
      } else if (authErrorResults.length > 0) {
        // Show authentication error modal
        setAuthErrors(authErrorResults);
        setShowAuthErrorModal(true);
        
        // Also show regular status for other errors if any
        if (otherErrors.length > 0) {
          const errorMessages = otherErrors
            .map((r) => `${r.platform}: ${r.userFriendlyMessage || r.error}`)
            .join('; ');
          setStatus({ success: false, message: `Some posts failed: ${errorMessages}` });
        } else {
          setStatus({ success: false, message: 'Please reconnect your social media accounts to continue posting.' });
        }
      } else {
        // Only regular errors, no auth issues
        const errors = otherErrors
          .map((r) => `${r.platform}: ${r.userFriendlyMessage || r.error}`)
          .join('; ');
        setStatus({ success: false, message: `Some posts failed: ${errors}` });
      }

      setPostQueue(prev => prev.map(item => {
        const result = results.find(r => r.platform === item.platform);
        if (result) {
          return {
            ...item,
            status: result.success ? 'completed' : 'failed',
            resultId: result.postId,
            error: result.userFriendlyMessage || result.error,
          };
        }
        return item;
      }));

    } catch (error) {
      setStatus({ success: false, message: `Publish failed: ${error.message}` });
      setPostQueue(prev => prev.map(item => ({
        ...item,
        status: 'failed',
        error: error.message,
      })));
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle scheduled posting (Schedule for Later)
  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      setStatus({ success: false, message: 'Please select at least one platform.' });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setStatus({ success: false, message: 'Please select a date and time for scheduling.' });
      return;
    }

    // Combine date and time into ISO string
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Check if scheduled time is in the future
    if (scheduledDateTime <= new Date()) {
      setStatus({ success: false, message: 'Scheduled time must be in the future.' });
      return;
    }

    setIsScheduling(true);
    setStatus(null);

    try {
      // If scheduling YouTube and no general message, use YouTube title as content so scheduler can title the video
      const contentForSchedule = message && message.trim().length > 0
        ? message
        : (selectedPlatforms.includes('youtube') ? (youtubeConfig.title || '') : '');

      // Attach YouTube-specific meta to targets so we can evolve later
      const targets = { ...(accountsByProvider || {}) };
      if (selectedPlatforms.includes('youtube')) {
        targets.youtube = {
          ...(targets.youtube || {}),
          meta: {
            title: youtubeConfig.title || '',
            description: youtubeConfig.description || '',
            privacy: youtubeConfig.privacy || 'private',
            categoryId: youtubeConfig.categoryId || '22',
            tags: youtubeConfig.tags || [],
          },
        };
      }

      const result = await createScheduledPost({
        content: contentForSchedule,
        mediaFiles,
        platforms: selectedPlatforms,
        scheduledTime: scheduledDateTime.toISOString(),
        targets,
      });

      if (result.success) {
        setStatus({ 
          success: true, 
          message: `Post scheduled for ${scheduledDateTime.toLocaleString()}!` 
        });
        // Clear form after successful scheduling
        setMessage('');
        setMediaFiles([]);
        setSelectedPlatforms([]);
        setScheduledDate('');
        setScheduledTime('');
        setIsScheduled(false);
      } else {
        setStatus({ success: false, message: `Failed to schedule post: ${result.error}` });
      }
    } catch (error) {
      setStatus({ success: false, message: `Schedule failed: ${error.message}` });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    // Main page container with sidebar-aware responsive design
    <div className="min-h-screen bg-gray-50 py-3 md:py-6 lg:py-10 px-2 sm:px-4 lg:px-6 xl:px-8 font-sans">

      {/* Responsive container that adapts to sidebar state */}
      <div className="w-full max-w-7xl mx-auto">
        
        {/* Adaptive layout: stacked on small/medium screens, flexible columns on large screens */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-3 md:gap-4 lg:gap-6">
          
          {/* Post Editor - Primary content, takes most space */}
          <div className="order-2 xl:order-2 xl:col-span-6 w-full bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6">
            <PostEditor
              message={message}
              setMessage={setMessage}
              mediaFiles={mediaFiles}
              setMediaFiles={setMediaFiles}
              youtubeConfig={youtubeConfig}
              setYoutubeConfig={setYoutubeConfig}
              selectedPlatforms={selectedPlatforms}
              togglePlatform={togglePlatform}
              handlePublish={handlePublish}
              isPublishing={isPublishing}
              status={status}
              accountsByProvider={accountsByProvider}
              setAccountsByProvider={setAccountsByProvider}
              // Scheduling props
              isScheduled={isScheduled}
              setIsScheduled={setIsScheduled}
              scheduledDate={scheduledDate}
              setScheduledDate={setScheduledDate}
              scheduledTime={scheduledTime}
              setScheduledTime={setScheduledTime}
              handleSchedule={handleSchedule}
              isScheduling={isScheduling}
            />
          </div>

          {/* Post Preview - Compact but visible */}
          <div className="order-1 xl:order-1 xl:col-span-3 w-full bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-800 mb-3 md:mb-4">Post Preview</h2>
            <PostPreview
              selectedPlatforms={selectedPlatforms}
              message={message}
              mediaFiles={mediaFiles}
              youtubeConfig={youtubeConfig}
              platformsList={platformsList}
              setMessage={setMessage}
            />
          </div>

          {/* Post Queue - Collapsible on smaller screens */}
          <div className="order-3 xl:order-3 xl:col-span-3 w-full bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-800 mb-3 md:mb-4">Posting Queue</h2>
            <PostQueue postQueue={postQueue} />
          </div>
        </div>
      </div>

      {/* Authentication Error Modal */}
      <AuthErrorModal
        isOpen={showAuthErrorModal}
        onClose={() => {
          setShowAuthErrorModal(false);
          setAuthErrors([]);
        }}
        errors={authErrors}
        onReconnect={handleReconnect}
      />
    </div>
  );
}