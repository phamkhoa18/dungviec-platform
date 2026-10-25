import { FIT_META } from "@/lib/ai-thresholds";
import { STATUS_META, toHrStatus } from "@/lib/hr-types";
import type { ApplicationStatus, FitLabel } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-bold";

export function FitBadge({ label, className }: { label: FitLabel; className?: string }) {
  const meta = FIT_META[label];
  return <span className={cn(base, meta.badge, className)}>{meta.label}</span>;
}

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const meta = STATUS_META[toHrStatus(status)];
  return <span className={cn(base, meta.badge, className)}>{meta.label}</span>;
}

/** Thẻ trắng dùng chung trong khu HR. */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-white shadow-[0_2px_12px_rgba(30,60,120,0.06)] ring-1 ring-black/[0.04]",
        className
      )}
    >
      {children}
    </section>
  );
}

/** Trạng thái rỗng thống nhất. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[15px] font-bold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#666666]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Trạng thái lỗi thống nhất, có nút thử lại. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      title="Không tải được dữ liệu"
      hint={message}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-full bg-[#306BD9] px-6 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
        >
          Thử lại
        </button>
      }
    />
  );
}
