import React from 'react';
import TagLink from './TagLink';

const TaggedText = ({ text, mediaFiles, className = "" }) => {
  if (!text) return null;

  // Split text by @mentions and create components
  const parseText = (text) => {
    const parts = [];
    const regex = /@(\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add the tag
      parts.push({
        type: 'tag',
        content: match[1] // The tag name without @
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const parts = parseText(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'tag') {
          return (
            <TagLink
              key={index}
              tag={part.content}
              mediaFiles={mediaFiles}
              className="mx-1"
            />
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};

export default TaggedText;
