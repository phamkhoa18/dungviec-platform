export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <div className="mx-auto grid max-w-[1140px] gap-5 px-4 py-10 lg:grid-cols-[1fr_340px] xl:px-0">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-white" />
          <div className="h-56 animate-pulse rounded-xl bg-white" />
          <div className="h-72 animate-pulse rounded-xl bg-white" />
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-white" />
      </div>
    </div>
  );
}
