import React, { useState, useRef, useEffect } from 'react';

const MentionInput = ({ 
  value, 
  onChange, 
  placeholder = "Enter task description (optional)", 
  mediaFiles = [],
  className = "",
  rows = 3
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Parse mentions from text
  const parseMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  // Get current mention being typed
  const getCurrentMention = (text, cursorPos) => {
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return null;
    
    // Check if there's a space after @ (which would end the mention)
    const afterAt = beforeCursor.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) return null;
    
    return {
      start: lastAtIndex,
      query: afterAt
    };
  };

  // Extract all unique tags from media files
  const getAllTags = () => {
    const allTags = new Set();
    mediaFiles.forEach(media => {
      if (media.tags && Array.isArray(media.tags)) {
        media.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  };

  // Filter tags based on query
  const filterTags = (query) => {
    const allTags = getAllTags();
    if (!query) return allTags;
    return allTags.filter(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Handle text change
  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    const currentMention = getCurrentMention(newValue, cursorPos);
    
    if (currentMention) {
      setMentionStart(currentMention.start);
      const filteredTags = filterTags(currentMention.query);
      setSuggestions(filteredTags);
      setShowSuggestions(filteredTags.length > 0);
    } else {
      setShowSuggestions(false);
      setMentionStart(-1);
    }
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Handle arrow down for suggestion selection
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Handle arrow up for suggestion selection
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Handle enter to select first suggestion
        if (suggestions.length > 0) {
          selectMention(suggestions[0]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  // Select a mention
  const selectMention = (tag) => {
    if (mentionStart === -1) return;
    
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(cursorPosition);
    const newValue = beforeMention + `@${tag} ` + afterMention;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(-1);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + tag.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          textareaRef.current && !textareaRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display value with mention highlighting
  const getDisplayValue = () => {
    if (!value) return '';
    
    // Replace @mentions with highlighted versions
    return value.replace(/@(\w+)/g, (match, tag) => {
      const allTags = getAllTags();
      if (allTags.includes(tag)) {
        return `@${tag}`;
      }
      return match;
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          const currentMention = getCurrentMention(value, cursorPosition);
          if (currentMention) {
            setShowSuggestions(true);
          }
        }}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${className}`}
        placeholder={placeholder}
      />
      
      {/* Tag Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((tag, index) => (
            <div
              key={tag}
              onClick={() => selectMention(tag)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                <span className="text-xs text-blue-600 font-medium">#</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {tag}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  Tag
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
