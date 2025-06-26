'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

export default function CreatePostPage() {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState(null);
  const textareaRef = useRef(null);

  const applyTemplate = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.slice(start, end);

    const newText =
      message.slice(0, start) +
      before +
      selectedText +
      after +
      message.slice(end);

    setMessage(newText);

    const cursorPos = start + before.length + selectedText.length + after.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  async function handlePublish(platform) {
    setStatus(null);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setStatus({ type: 'error', msg: 'You must be logged in to publish.' });
      return;
    }

    if (platform === 'instagram' && !imageFile) {
      setStatus({ type: 'error', msg: 'You must upload a photo to post on Instagram.' });
      return;
    }

    try {
      if (platform === 'facebook') {
        const res = await fetch('http://localhost:8080/api/facebook/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to publish');
        }

        setStatus({ type: 'success', msg: 'Facebook post published successfully!' });
        setMessage('');
      } else if (platform === 'instagram') {
        const formData = new FormData();
        formData.append('caption', message);
        formData.append('image', imageFile);

        const res = await axios.post('http://localhost:8080/api/instagram/post', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        if (res.status !== 200) {
          throw new Error(res.data.error || 'Failed to publish Instagram post');
        }

        setStatus({ type: 'success', msg: 'Instagram post published successfully!' });
        setMessage('');
        setImageFile(null);
      } else {
        setStatus({ type: 'error', msg: 'Unsupported platform' });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: error.message || 'Publishing failed' });
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Create New Post</h1>

      {/* Toolbar */}
      <div className="flex space-x-2 mb-3 text-gray-900">
        <button
          type="button"
          onClick={() => applyTemplate('**', '**')}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('_', '_')}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('# ')}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="Heading"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('> ')}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="Blockquote"
        >
          ❝
        </button>
        <button
          type="button"
          onClick={() => applyTemplate('- ')}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="Bullet List"
        >
          •
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        placeholder="Write your post caption here..."
        className="w-full p-3 resize-none rounded border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Image upload only for Instagram */}
      <div className="mt-4">
        <label className="block mb-2 font-semibold text-gray-700">
          Upload photo (required for Instagram)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0] || null)}
          className="border p-2 rounded"
        />
        {imageFile && (
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            className="mt-2 max-h-48 rounded shadow"
            onLoad={(e) => URL.revokeObjectURL(e.target.src)}
          />
        )}
      </div>

      {/* Status message */}
      {status && (
        <p
          className={`mt-3 ${
            status.type === 'error' ? 'text-red-600' : 'text-green-600'
          }`}
          role="alert"
        >
          {status.msg}
        </p>
      )}

      {/* Publish buttons */}
      <div className="mt-5 space-x-4">
        <button
          onClick={() => handlePublish('facebook')}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Publish to Facebook Page
        </button>

        <button
          onClick={() => handlePublish('instagram')}
          disabled={!imageFile}
          className={`px-5 py-2 text-white rounded hover:opacity-90 transition ${
            imageFile ? 'bg-pink-600 hover:bg-pink-700' : 'bg-pink-300 cursor-not-allowed'
          }`}
        >
          Publish to Instagram
        </button>
      </div>
    </div>
  );
}
