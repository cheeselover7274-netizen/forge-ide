import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

export function WantCardSkeleton() {
  return (
    <Card className="h-full border-slate-800/50">
      <div className="p-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex justify-between pt-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </Card>
  );
}
