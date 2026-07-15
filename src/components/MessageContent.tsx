'use client';

import { type ReactNode } from 'react';
import LinkPreviewCard from '@/components/LinkPreviewCard';
import { extractUrls, messageIsOnlyUrl } from '@/lib/linkUtils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  isAI?: boolean;
}

export default function MessageContent({ content, isCurrentUser, translatedContent, isAI }: MessageContentProps) {
  const urls = extractUrls(content);
  const primaryUrl = urls[0];
  const onlyUrl = messageIsOnlyUrl(content);

  const textClass = isCurrentUser ? 'text-white' : 'text-gray-800 dark:text-gray-100';
  const linkClass = isCurrentUser
    ? 'underline text-white/95 hover:text-white'
    : 'underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300';

  return (
    <>
      {!onlyUrl && (
        <div className="flex flex-col">
          {isAI ? (
            <div className={`ai-markdown text-xs md:text-sm leading-relaxed break-words ${textClass}`}>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.9em] font-mono" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <div className="relative my-2 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-black/15 dark:bg-white/10 text-[10px] opacity-70">
                          <span>{className?.replace('language-', '') || 'code'}</span>
                        </div>
                        <code className="block p-3 bg-black/5 dark:bg-white/5 overflow-x-auto text-[0.85em] font-mono leading-relaxed" {...props}>
                          {children}
                        </code>
                      </div>
                    );
                  },
                  pre: ({ children }) => <pre className="my-1">{children}</pre>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 pl-3 my-2 opacity-80 italic">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-90 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="my-3 border-current opacity-20" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="border-collapse text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-current/20 px-2 py-1 font-semibold text-left">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-current/20 px-2 py-1">{children}</td>
                  ),
                }}
              >
                {content}
              </Markdown>
            </div>
          ) : (
            <p
              className={`text-xs md:text-sm leading-snug break-words whitespace-pre-wrap ${textClass}`}
            >
              {renderLinkedText(content, linkClass)}
            </p>
          )}
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
