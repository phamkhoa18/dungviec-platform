"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Building2, Hash, Loader2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import { EmptyState, Panel } from "@/components/hr/ui-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveCompany } from "@/hooks/hr/use-hr-data";
import { useAuth } from "@/hooks/use-auth";
import type { CompanyRecord } from "@/lib/db/types";

const SIZES = ["1 - 10 nhân viên", "11 - 50 nhân viên", "51 - 200 nhân viên", "201 - 500 nhân viên", "Trên 500 nhân viên"];
const fieldCls =
  "h-11 rounded-[10px] border-[#D9D9D9] bg-white px-3.5 text-[14px] shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[13px] font-semibold text-[#222222]";

function ReadonlyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#306BD9] shadow-xs">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[#777777]">{label}</p>
        <p className="text-[14px] leading-5 font-bold break-words text-[#111111]">{value}</p>
      </div>
    </div>
  );
}

function CompanyForm({ company }: { company: CompanyRecord }) {
  const { refreshAuth } = useAuth();
  const save = useSaveCompany(company);
  const [website, setWebsite] = useState(company.website ?? "");
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [size, setSize] = useState(company.company_size ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [websiteError, setWebsiteError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = website.trim();
    if (w && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(w)) {
      setWebsiteError("Website cần bắt đầu bằng http:// hoặc https://");
      return;
    }
    setWebsiteError("");
    try {
      await save.mutateAsync({
        website: w,
        industry: industry.trim(),
        company_size: size,
        description: description.trim(),
      });
      await refreshAuth();
      toast.success("Đã cập nhật hồ sơ công ty.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được hồ sơ công ty.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <Panel className="h-fit p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold">Thông tin pháp lý</h2>
          {company.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-bold text-[#15803D] ring-1 ring-[#BBF7D0]">
              <BadgeCheck className="size-3.5" />
              Đã xác thực MST
            </span>
          )}
        </div>
        <div className="space-y-4 rounded-xl bg-[#F5F9FF] p-4">
          <ReadonlyRow icon={Building2} label="Tên doanh nghiệp" value={company.company_name} />
          {company.tax_code && <ReadonlyRow icon={Hash} label="Mã số thuế" value={company.tax_code} />}
          <ReadonlyRow icon={MapPin} label="Địa chỉ" value={company.address} />
        </div>
        <p className="mt-3 text-[12px] leading-[18px] text-[#777777]">
          {company.verified
            ? "Thông tin lấy từ dữ liệu Tổng cục Thuế khi đăng ký nên không chỉnh sửa tại đây."
            : "Thông tin này chưa được xác thực bằng mã số thuế."}
        </p>
      </Panel>

      <Panel className="p-5">
        <h2 className="mb-4 text-[15px] font-extrabold">Giới thiệu công ty</h2>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="co-website" className={labelCls}>
              Website
            </Label>
            <Input
              id="co-website"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setWebsiteError("");
              }}
              placeholder="https://tencongty.vn"
              aria-invalid={!!websiteError}
              className={fieldCls}
            />
            {websiteError && (
              <p role="alert" className="text-[12.5px] font-medium text-[#DC2626]">
                {websiteError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co-industry" className={labelCls}>
                Lĩnh vực hoạt động
              </Label>
              <Input
                id="co-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="VD: Phần mềm, Tài chính"
                className={fieldCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Quy mô nhân sự</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className={`w-full ${fieldCls}`}>
                  <SelectValue placeholder="Chọn quy mô" />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="co-desc" className={labelCls}>
              Mô tả công ty
            </Label>
            <Textarea
              id="co-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn về công ty, văn hóa và môi trường làm việc..."
              className="rounded-[10px] border-[#D9D9D9] px-3.5 py-3 text-[14px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={save.isPending}
              className="flex h-11 items-center gap-2 rounded-full bg-[#306BD9] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#2458BD] disabled:opacity-70"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export default function HrCompanyPage() {
  const { company } = useAuth();
  return (
    <>
      <PageHeader title="Công ty" subtitle="Hồ sơ doanh nghiệp hiển thị cho ứng viên trên tin tuyển dụng." />
      {company ? (
        <CompanyForm key={company.id} company={company} />
      ) : (
        <Panel>
          <EmptyState
            title="Chưa có hồ sơ công ty"
            hint="Tài khoản này chưa gắn với doanh nghiệp nào. Hãy đăng ký lại bằng mã số thuế."
          />
        </Panel>
      )}
    </>
  );
}
