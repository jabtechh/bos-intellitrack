import { Skeleton } from "@/components/ui";

export default function Loading() {
  return <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8" aria-label="Loading content"><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-10 max-w-md" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div><Skeleton className="mt-6 h-72" /></main>;
}
