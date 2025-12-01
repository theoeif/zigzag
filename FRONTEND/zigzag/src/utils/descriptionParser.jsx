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
  
  // Original simple pattern - allows all non-whitespace characters (including _, ?, etc.)
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
    
    let url = match[0];
    let urlEndIndex = match.index + url.length;
    
    // Only check for trailing period (.), comma (,), or closing parenthesis ())
    // These are the only punctuation we want to exclude from URLs
    if (url.endsWith('.') || url.endsWith(',') || url.endsWith(')')) {
      const nextChar = text[urlEndIndex];
      // If next char is whitespace or end of string, exclude the trailing punctuation
      if (!nextChar || /\s/.test(nextChar)) {
        const punct = url[url.length - 1];
        url = url.slice(0, -1);
        urlEndIndex = match.index + url.length;
        
        // Add URL as link
        parts.push({
          type: 'link',
          content: url,
          url: url
        });
        
        // Add punctuation as text
        parts.push({
          type: 'text',
          content: punct
        });
        
        lastIndex = urlEndIndex + 1; // +1 for the punctuation
        continue;
      }
    }
    
    // Add the URL as a link (no trailing punctuation to remove)
    parts.push({
      type: 'link',
      content: url,
      url: url
    });
    
    lastIndex = urlEndIndex;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  // Merge consecutive text parts
  const mergedParts = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0 && parts[i].type === 'text' && parts[i - 1].type === 'text') {
      mergedParts[mergedParts.length - 1].content += parts[i].content;
    } else {
      mergedParts.push(parts[i]);
    }
  }
  
  // If no URLs were found, return the whole text as a single text part
  if (mergedParts.length === 0) {
    mergedParts.push({
      type: 'text',
      content: text
    });
  }
  
  return mergedParts;
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
            cursor: 'pointer',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
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
