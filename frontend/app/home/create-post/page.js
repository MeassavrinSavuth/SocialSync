'use client';

import { useState } from 'react';
import PlatformSelector from '../../components/PlatformSelector';
import PostEditor from '../../components/PostEditor';
import PostPreview from '../../components/PostPreview';
import { useMultiPlatformPublish } from '../../hooks/api/useMultiPlatformPublish';

export default function CreatePostPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [message, setMessage] = useState('');
  const [youtubeConfig, setYoutubeConfig] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState([]); // array of Cloudinary URLs
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState(null); // { success: bool, message: string }

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

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsPublishing(true);
    setStatus(null);
    try {
      const results = await publish(selectedPlatforms);
      console.log('Publish results:', results);

      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        setStatus({ success: true, message: 'All posts published successfully!' });
      } else {
        const errors = results
          .filter((r) => !r.success)
          .map((r) => `${r.platform}: ${r.error}`)
          .join('; ');
        setStatus({ success: false, message: `Some posts failed: ${errors}` });
      }
    } catch (error) {
      setStatus({ success: false, message: `Publish failed: ${error.message}` });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10 flex items-start gap-10 max-w-8xl mx-auto font-sans">
      <PlatformSelector
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
      />

      <PostEditor
        message={message}
        setMessage={setMessage}
        mediaFiles={mediaFiles}
        setMediaFiles={setMediaFiles}
        youtubeConfig={youtubeConfig}
        setYoutubeConfig={setYoutubeConfig}
        selectedPlatforms={selectedPlatforms}
        handlePublish={handlePublish}
        isPublishing={isPublishing}
        status={status}
      />

      <PostPreview
        selectedPlatforms={selectedPlatforms}
        message={message}
        mediaFiles={mediaFiles}
        youtubeConfig={youtubeConfig}
      />
    </div>
  );
}
