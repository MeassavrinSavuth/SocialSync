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
  const [mediaFiles, setMediaFiles] = useState([]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const { publish, status, isPublishing } = useMultiPlatformPublish({ message, mediaFiles, youtubeConfig });

  const handlePublish = () => {
    if (selectedPlatforms.length === 0) return;
    publish(selectedPlatforms);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10 flex items-start gap-10 max-w-8xl mx-auto font-sans">
      <PlatformSelector selectedPlatforms={selectedPlatforms} togglePlatform={togglePlatform} />

      <PostEditor
        message={message}
        setMessage={setMessage}
        youtubeConfig={youtubeConfig}
        setYoutubeConfig={setYoutubeConfig}
        mediaFiles={mediaFiles}
        setMediaFiles={setMediaFiles}
        selectedPlatforms={selectedPlatforms}
        handlePublish={handlePublish}
        status={status}
        isPublishing={isPublishing}
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
