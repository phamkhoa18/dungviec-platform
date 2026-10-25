import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/shared/brand";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-amber-50 p-6 text-center">
      <div className="absolute -left-20 top-0 size-96 rounded-full bg-sky-200/50 blur-3xl" aria-hidden />
      <div className="absolute -right-20 bottom-0 size-96 rounded-full bg-pink-200/50 blur-3xl" aria-hidden />
      <div className="relative">
        <Mascot pose="search" className="float-slow mx-auto w-56" />
        <p className="mt-4 font-heading text-6xl font-semibold tracking-[-0.05em] text-primary">404</p>
        <h1 className="mt-2 font-heading text-2xl font-medium text-ink">Không tìm thấy trang bạn yêu cầu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Có thể đường dẫn đã đổi hoặc không còn tồn tại.</p>
        <Button asChild size="lg" className="mt-6 rounded-full"><Link href="/">Về trang chủ</Link></Button>
      </div>
    </main>
  );
}
