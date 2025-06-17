'use client';

import { useState, useRef } from 'react';

export default function CreatePostPage() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // success or error message
  const textareaRef = useRef(null);

  // Simple text formatting helper: wraps selection or inserts template
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

    // Place cursor after inserted text
    const cursorPos = start + before.length + selectedText.length + after.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  async function handlePublish() {
  setStatus(null);
  if (!message.trim()) {
    setStatus({ type: 'error', msg: 'Post message cannot be empty' });
    return;
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    setStatus({ type: 'error', msg: 'You must be logged in to publish.' });
    return;
  }

  try {
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

    setStatus({ type: 'success', msg: 'Post published successfully!' });
    setMessage('');
  } catch (error) {
    setStatus({ type: 'error', msg: error.message });
  }
}


  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl text-gray-900 font-bold mb-4">Create New Facebook Post</h1>

      {/* Toolbar */}
      <div className="flex text-gray-900 space-x-2 mb-3">
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
        className="w-full border text-gray-900 border-gray-300 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Write your post here..."
      />

      {/* Status message */}
      {status && (
        <p
          className={`mt-3 ${
            status.type === 'error' ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {status.msg}
        </p>
      )}

      {/* Publish button */}
      <button
        onClick={handlePublish}
        className="mt-5 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Publish to Facebook Page
      </button>
    </div>
  );
}
