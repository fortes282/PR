"use client";

type PageSkeletonProps = {
  /** Number of content lines to show (default 4). */
  lines?: number;
};

export function PageSkeleton({ lines = 4 }: PageSkeletonProps): React.ReactElement {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Načítání">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-gray-200"
            style={{ width: i === lines - 1 && lines > 2 ? "75%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}
