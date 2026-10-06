import { Skeleton } from '@/components/feedback';

export function LoadingTickets() {
  return (
    <div className="space-y-2 px-4 py-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={`ticket-loading-${index}`} className="grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((__, colIndex) => (
            <Skeleton key={`ticket-loading-${index}-${colIndex}`} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
