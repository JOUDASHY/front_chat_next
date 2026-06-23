'use client';

import { type ReactNode } from 'react';
import LinkPreviewCard from '@/components/LinkPreviewCard';
import { extractUrls, messageIsOnlyUrl } from '@/lib/linkUtils';

const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"]/gi;

function renderLinkedText(text: string, linkClassName: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClassName} break-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface MessageContentProps {
  content: string;
  isCurrentUser: boolean;
  translatedContent?: string;
}

export default function MessageContent({ content, isCurrentUser, translatedContent }: MessageContentProps) {
  const urls = extractUrls(content);
  const primaryUrl = urls[0];
  const onlyUrl = messageIsOnlyUrl(content);

  const textClass = isCurrentUser ? 'text-white' : 'text-gray-800';
  const linkClass = isCurrentUser
    ? 'underline text-white/95 hover:text-white'
    : 'underline text-indigo-600 hover:text-indigo-700';

  return (
    <>
      {!onlyUrl && (
        <div className="flex flex-col">
          <p
            className={`text-xs md:text-sm leading-snug break-words whitespace-pre-wrap ${textClass}`}
          >
            {renderLinkedText(content, linkClass)}
          </p>
          {translatedContent && (
            <p className={`text-[11px] md:text-xs leading-snug break-words whitespace-pre-wrap mt-1 opacity-70 italic ${textClass}`}>
              {translatedContent}
            </p>
          )}
        </div>
      )}

      {primaryUrl && (
        <LinkPreviewCard
          url={primaryUrl}
          isCurrentUser={isCurrentUser}
          compact={!onlyUrl}
        />
      )}
    </>
  );
}
