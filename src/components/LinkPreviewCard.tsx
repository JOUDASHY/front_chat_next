'use client';

import { useEffect, useState } from 'react';
import { isValidHttpUrl } from '@/lib/linkUtils';

type LinkPreviewData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

const previewCache = new Map<string, LinkPreviewData>();

interface LinkPreviewCardProps {
  url: string;
  isCurrentUser?: boolean;
  compact?: boolean;
}

export default function LinkPreviewCard({
  url,
  isCurrentUser = false,
  compact = false,
}: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(
    () => previewCache.get(url) ?? null
  );
  const [loading, setLoading] = useState(!previewCache.has(url));

  useEffect(() => {
    if (!isValidHttpUrl(url)) return;

    const cached = previewCache.get(url);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/link-preview/?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LinkPreviewData | null) => {
        if (cancelled || !data) return;
        previewCache.set(url, data);
        setPreview(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({ url, title: new URL(url).hostname, description: null, image: null });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!isValidHttpUrl(url)) return null;

  const cardClasses = isCurrentUser
    ? 'border-white/20 bg-white/10 hover:bg-white/15'
    : 'border-gray-200 bg-gray-50 hover:bg-gray-100';

  const titleClasses = isCurrentUser ? 'text-white' : 'text-gray-900';
  const descClasses = isCurrentUser ? 'text-white/75' : 'text-gray-600';
  const hostClasses = isCurrentUser ? 'text-white/60' : 'text-gray-400';

  if (loading) {
    return (
      <div className={`mt-2 rounded-xl border overflow-hidden animate-pulse ${cardClasses}`}>
        <div className={`h-28 ${isCurrentUser ? 'bg-white/10' : 'bg-gray-200'}`} />
        <div className="p-3 space-y-2">
          <div className={`h-3 rounded w-3/4 ${isCurrentUser ? 'bg-white/15' : 'bg-gray-200'}`} />
          <div className={`h-2.5 rounded w-full ${isCurrentUser ? 'bg-white/10' : 'bg-gray-100'}`} />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-xl border overflow-hidden transition-colors ${cardClasses} ${
        compact ? 'max-w-xs' : 'max-w-sm'
      }`}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className={`w-full object-cover ${compact ? 'h-24' : 'h-32'}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="p-3">
        <p className={`text-[10px] uppercase tracking-wide font-medium truncate ${hostClasses}`}>
          {hostname}
        </p>
        {preview.title && (
          <p className={`text-sm font-semibold line-clamp-2 mt-0.5 ${titleClasses}`}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${descClasses}`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
