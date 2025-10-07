'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaCompress } from 'react-icons/fa';

// Convert HTML to plain text
function toPlainText(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return (el.textContent || '').replace(/\u00A0/g, ' ').trim();
}

// Get aspect ratio class based on media dimensions
function getAspectClass(attachment) {
  const w = attachment.meta?.original?.width ?? attachment.meta?.small?.width;
  const h = attachment.meta?.original?.height ?? attachment.meta?.small?.height;
  const r = w && h ? w / h : 1;
  
  if (r > 1.2) return "aspect-video";
  if (r < 0.9) return "aspect-[4/5]";
  return "aspect-square";
}

export default function MediaViewer({ 
  isOpen, 
  onClose, 
  attachments = [], 
  caption = '', 
  currentIndex = 0 
}) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(currentIndex);
      setIsZoomed(false);
      setLoadedImages(new Set());
      // Focus close button when opening
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setActiveIndex(prev => prev > 0 ? prev - 1 : attachments.length - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setActiveIndex(prev => prev < attachments.length - 1 ? prev + 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          setIsZoomed(!isZoomed);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, attachments.length, isZoomed, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  console.log('MediaViewer render:', { isOpen, attachmentsLength: attachments?.length, currentIndex });
  
  if (!isOpen || attachments.length === 0) {
    console.log('MediaViewer not rendering:', { isOpen, attachmentsLength: attachments?.length });
    return null;
  }

  const handleImageLoad = (index) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const renderMediaTile = (attachment, index) => {
    const isLoaded = loadedImages.has(index);
    const aspectClass = getAspectClass(attachment);
    
    console.log('MediaViewer rendering attachment:', {
      type: attachment.type,
      url: attachment.url,
      preview_url: attachment.preview_url,
      description: attachment.description,
      index
    });
    
    return (
      <div 
        key={attachment.id || index}
        className={`relative rounded-2xl overflow-hidden bg-white ${aspectClass}`}
      >
        {attachment.type === 'image' ? (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-200" />
            )}
            <img
              src={attachment.url || attachment.preview_url}
              alt={attachment.description || 'Media attachment'}
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => handleImageLoad(index)}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500 hidden">
              <span>📷</span>
            </div>
          </>
        ) : (attachment.type === 'gifv' || attachment.type === 'video') ? (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-200" />
            )}
            {/* Show poster image as fallback */}
            {attachment.preview_url && (
              <img
                src={attachment.preview_url}
                alt={attachment.description || 'Media attachment'}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  isLoaded ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => console.log('Poster loaded:', attachment.preview_url)}
              />
            )}
            <video
              src={attachment.url || attachment.preview_url}
              poster={attachment.preview_url}
              controls
              playsInline
              muted={attachment.type === 'gifv'}
              autoPlay={attachment.type === 'gifv'}
              loop={attachment.type === 'gifv'}
              preload="auto"
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoadedData={() => {
                console.log('Video loaded in viewer:', attachment.url);
                handleImageLoad(index);
              }}
              onCanPlay={() => {
                console.log('Video can play in viewer:', attachment.url);
                handleImageLoad(index);
              }}
              onLoadStart={() => console.log('Video loading started in viewer:', attachment.url)}
              onError={(e) => {
                console.log('Video error in viewer:', e.target.error, 'URL:', attachment.url, 'Preview:', attachment.preview_url);
                // Keep the poster image visible
                handleImageLoad(index);
              }}
            />
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500 hidden">
              <span>🎥</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
            <span>📎 {attachment.type}</span>
          </div>
        )}
        
        {/* ALT badge for images */}
        {attachment.type === 'image' && attachment.description && (
          <div className="absolute left-2 bottom-2 rounded-md bg-black/70 text-white text-xs px-2 py-1">
            ALT
          </div>
        )}
      </div>
    );
  };

  const renderLayout = () => {
    const count = attachments.length;
    
    if (count === 1) {
      return (
        <div className="flex justify-center items-center h-full p-8">
          <div className="w-full max-w-4xl">
            {renderMediaTile(attachments[0], 0)}
          </div>
        </div>
      );
    }
    
    if (count === 2) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full p-8">
          <div className="flex items-center">
            {renderMediaTile(attachments[0], 0)}
          </div>
          <div className="flex items-center">
            {renderMediaTile(attachments[1], 1)}
          </div>
        </div>
      );
    }
    
    if (count === 3) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-8">
          {attachments.slice(0, 3).map((attachment, index) => (
            <div key={attachment.id || index} className="flex items-center">
              {renderMediaTile(attachment, index)}
            </div>
          ))}
        </div>
      );
    }
    
    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-6 h-full p-8">
          {attachments.slice(0, 4).map((attachment, index) => (
            <div key={attachment.id || index} className="flex items-center">
              {renderMediaTile(attachment, index)}
            </div>
          ))}
        </div>
      );
    }
    
    // 4+ attachments
    return (
      <div className="grid grid-cols-2 gap-6 h-full p-8">
        {attachments.slice(0, 4).map((attachment, index) => (
          <div key={attachment.id || index} className="flex items-center relative">
            {renderMediaTile(attachment, index)}
            {index === 3 && count > 4 && (
              <div className="absolute right-2 bottom-2 rounded-md bg-black/70 text-white text-xs px-2 py-1">
                +{count - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-gray-900 text-lg font-medium truncate" title={toPlainText(caption)}>
            {toPlainText(caption) || 'Media'}
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="ml-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Close media viewer"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Media content */}
      <div className="flex-1 p-4 overflow-hidden">
        {renderLayout()}
      </div>

      {/* Navigation controls for multiple attachments */}
      {attachments.length > 1 && (
        <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-200">
          <button
            onClick={() => setActiveIndex(prev => prev > 0 ? prev - 1 : attachments.length - 1)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Previous media"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-600 text-sm">
            {activeIndex + 1} of {attachments.length}
          </span>
          <button
            onClick={() => setActiveIndex(prev => prev < attachments.length - 1 ? prev + 1 : 0)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Next media"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
