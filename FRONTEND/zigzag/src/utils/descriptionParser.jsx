import React from 'react';

/**
 * Parses description text and converts URLs to clickable links
 * while preserving text selection capability
 * 
 * @param {string} text - The description text to parse
 * @returns {Array} Array of objects with type ('text' or 'link') and content
 */
export const parseDescriptionWithLinks = (text) => {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Add the URL as a link
    parts.push({
      type: 'link',
      content: match[0],
      url: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  // If no URLs were found, return the whole text as a single text part
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text
    });
  }
  
  return parts;
};

/**
 * Renders description text with clickable links as React elements
 * 
 * @param {string} text - The description text to render
 * @returns {Array} Array of React elements (text nodes and link elements)
 */
export const renderDescriptionWithLinks = (text) => {
  const parts = parseDescriptionWithLinks(text);
  
  return parts.map((part, index) => {
    if (part.type === 'link') {
      return (
        <a
          key={index}
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#2196F3',
            textDecoration: 'underline',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            msUserSelect: 'text',
            cursor: 'pointer'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </a>
      );
    }
    return <span key={index}>{part.content}</span>;
  });
};
