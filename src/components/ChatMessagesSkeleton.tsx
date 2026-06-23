type SkeletonRow = {
  side: 'left' | 'right';
  lines: string[];
};

const SKELETON_ROWS: SkeletonRow[] = [
  { side: 'left', lines: ['w-44 md:w-52', 'w-28 md:w-36'] },
  { side: 'right', lines: ['w-36 md:w-44'] },
  { side: 'left', lines: ['w-56 md:w-64', 'w-40 md:w-48', 'w-24 md:w-28'] },
  { side: 'right', lines: ['w-48 md:w-56', 'w-32 md:w-40'] },
  { side: 'left', lines: ['w-36 md:w-44'] },
  { side: 'right', lines: ['w-52 md:w-60', 'w-28 md:w-32'] },
  { side: 'left', lines: ['w-40 md:w-48', 'w-32 md:w-36'] },
];

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton-shimmer h-3 rounded-full ${className}`} />;
}

function LeftBubble({ lines }: { lines: string[] }) {
  return (
    <div className="flex justify-start items-end gap-2">
      <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-full" />
      <div className="max-w-[75%] space-y-2 rounded-2xl rounded-tl-sm bg-gray-100/80 dark:bg-gray-800 px-3 py-3">
        {lines.map((width, index) => (
          <SkeletonLine key={index} className={width} />
        ))}
      </div>
    </div>
  );
}

function RightBubble({ lines }: { lines: string[] }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] space-y-2 rounded-2xl rounded-tr-sm bg-gray-100/80 dark:bg-gray-800 px-3 py-3">
        {lines.map((width, index) => (
          <SkeletonLine key={index} className={width} />
        ))}
      </div>
    </div>
  );
}

export default function ChatMessagesSkeleton() {
  return (
    <div
      className="space-y-4 md:space-y-5 py-2"
      aria-hidden="true"
      aria-label="Chargement des messages"
    >
      {SKELETON_ROWS.map((row, index) =>
        row.side === 'left' ? (
          <LeftBubble key={index} lines={row.lines} />
        ) : (
          <RightBubble key={index} lines={row.lines} />
        )
      )}
    </div>
  );
}
