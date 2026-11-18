import React from 'react';

const renderInlineMarkdown = (text: string, isUser: boolean): React.ReactNode[] => {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const segments = text.split(tokenRegex);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }
    if (segment.startsWith('`') && segment.endsWith('`') && segment.length > 2) {
      return (
        <code
          key={index}
          style={{
            backgroundColor: isUser ? 'rgba(22, 35, 54, 0.08)' : '#F5EFE2',
            color: isUser ? '#162336' : '#7C4F10',
            border: '1px solid rgba(22, 35, 54, 0.12)',
            padding: '1px 6px',
            borderRadius: '5px',
            fontSize: '0.88em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
      return <em key={index}>{segment.slice(1, -1)}</em>;
    }
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });
};

export const MarkdownRenderer: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="md-content">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed === '---' || trimmed === '***') {
          return (
            <hr
              key={i}
              className="md-hr"
              style={isUser ? { borderTopColor: 'rgba(22, 35, 54, 0.16)' } : undefined}
            />
          );
        }

        const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const fontSize = level === 1 ? '1.16em' : level === 2 ? '1.1em' : '1.03em';
          return (
            <div key={i} className="md-heading" style={{ fontSize }}>
              {renderInlineMarkdown(headingMatch[2], isUser)}
            </div>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="md-quote"
              style={
                isUser
                  ? {
                      background: 'rgba(255, 255, 255, 0.55)',
                      borderLeftColor: 'var(--accent-brass)',
                      color: 'var(--text-primary)',
                    }
                  : undefined
              }
            >
              {renderInlineMarkdown(trimmed.slice(2), isUser)}
            </blockquote>
          );
        }

        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}>
              <span aria-hidden="true">•</span>
              <span style={{ flex: 1 }}>{renderInlineMarkdown(bulletMatch[1], isUser)}</span>
            </div>
          );
        }

        const orderedMatch = line.match(/^\s*(\d+[.)])\s+(.+)$/);
        if (orderedMatch) {
          return (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px', paddingLeft: '2px' }}>
              <span style={{ fontWeight: 600 }}>{orderedMatch[1]}</span>
              <span style={{ flex: 1 }}>{renderInlineMarkdown(orderedMatch[2], isUser)}</span>
            </div>
          );
        }

        return (
          <div key={i} style={{ minHeight: trimmed === '' ? '0.55em' : 'auto', marginBottom: '4px' }}>
            {renderInlineMarkdown(line, isUser)}
          </div>
        );
      })}
    </div>
  );
};
