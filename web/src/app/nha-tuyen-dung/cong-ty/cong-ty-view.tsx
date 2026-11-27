"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  Gift,
  Globe,
  Hash,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import { EmptyState, Panel } from "@/components/hr/ui-parts";
import { Button } from "@/components/ui/button";
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

const SIZES = [
  "1 - 10 nhân viên",
  "11 - 50 nhân viên",
  "51 - 200 nhân viên",
  "201 - 500 nhân viên",
  "Trên 500 nhân viên",
];

const BENEFIT_SUGGESTIONS = [
  "Lương tháng 13 + thưởng hiệu suất",
  "Bảo hiểm sức khỏe toàn diện",
  "Xét tăng lương 2 lần/năm",
  "Làm việc Hybrid linh hoạt",
  "MacBook / Thiết bị làm việc hiện đại",
  "Du lịch công ty & Team building",
  "Đào tạo & Tài trợ chứng chỉ quốc tế",
];

const fieldCls =
  "h-10 rounded-[10px] border-[#D9D9D9] bg-white px-3.5 text-[13.5px] shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[12.5px] font-bold text-[#222222]";

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
        <p className="text-[11.5px] font-semibold text-[#777777]">{label}</p>
        <p className="text-[13.5px] leading-5 font-bold break-words text-[#111111]">
          {value}
        </p>
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
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(company.cover_url ?? "");
  const [benefits, setBenefits] = useState<string[]>(company.benefits ?? []);
  const [benefitDraft, setBenefitDraft] = useState("");
  const [facebook, setFacebook] = useState(
    company.social_links?.facebook ?? ""
  );
  const [linkedin, setLinkedin] = useState(
    company.social_links?.linkedin ?? ""
  );
  const [websiteError, setWebsiteError] = useState("");

  function addBenefit(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (!benefits.some((b) => b.toLowerCase() === t.toLowerCase())) {
      setBenefits([...benefits, t]);
    }
    setBenefitDraft("");
  }

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
        logo_url: logoUrl.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        benefits,
        social_links: {
          facebook: facebook.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
        },
      });
      await refreshAuth();
      toast.success("Đã cập nhật hồ sơ doanh nghiệp.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không lưu được hồ sơ công ty."
      );
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.45fr]">
      <div className="space-y-4">
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
            <ReadonlyRow
              icon={Building2}
              label="Tên doanh nghiệp"
              value={company.company_name}
            />
            {company.tax_code && (
              <ReadonlyRow
                icon={Hash}
                label="Mã số thuế"
                value={company.tax_code}
              />
            )}
            <ReadonlyRow
              icon={MapPin}
              label="Địa chỉ đăng ký"
              value={company.address}
            />
          </div>
          <p className="mt-3 text-[12px] leading-[18px] text-[#777777]">
            {company.verified
              ? "Thông tin pháp lý được đối chiếu từ dữ liệu Tổng cục Thuế khi đăng ký nên không chỉnh sửa trực tiếp tại đây."
              : "Thông tin này chưa được xác thực bằng mã số thuế."}
          </p>

          {company.slug && (
            <div className="mt-4 border-t border-[#EBEBEB] pt-4">
              <Link
                href={`/cong-ty/${company.slug}`}
                target="_blank"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#306BD9] bg-[#F5F9FF] py-2.5 text-[13px] font-bold text-[#306BD9] transition-colors hover:bg-[#EBF2FF]"
              >
                <ExternalLink className="size-4" />
                Xem trang công ty công khai
              </Link>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="p-5">
        <h2 className="mb-4 text-[15px] font-extrabold">
          Hồ sơ thương hiệu tuyển dụng
        </h2>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co-website" className={labelCls}>
                Website chính thức
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
                <p
                  role="alert"
                  className="text-[12px] font-medium text-[#DC2626]"
                >
                  {websiteError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Quy mô nhân sự</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className={`w-full ${fieldCls}`}>
                  <SelectValue placeholder="Chọn quy mô" />
                </SelectTrigger>
                <SelectContent>
                  {(size && !SIZES.includes(size) ? [size, ...SIZES] : SIZES).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="co-industry" className={labelCls}>
              Lĩnh vực hoạt động
            </Label>
            <Input
              id="co-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="VD: Phát triển phần mềm, Trí tuệ nhân tạo & Chuyển đổi số"
              className={fieldCls}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co-logo" className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="size-3.5 text-[#306BD9]" />
                  URL Logo công ty
                </span>
              </Label>
              <Input
                id="co-logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
                className={fieldCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="co-cover" className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="size-3.5 text-[#306BD9]" />
                  URL Ảnh bìa (Cover)
                </span>
              </Label>
              <Input
                id="co-cover"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://.../cover.jpg"
                className={fieldCls}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="co-desc" className={labelCls}>
              Giới thiệu công ty &amp; Văn hóa làm việc
            </Label>
            <Textarea
              id="co-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu về sứ mệnh, sản phẩm chủ lực, văn hóa kỹ thuật và cơ hội phát triển tại doanh nghiệp..."
              className="rounded-[10px] border-[#D9D9D9] px-3.5 py-2.5 text-[13.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
            />
          </div>

          {/* Phúc lợi nổi bật */}
          <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <Label className={labelCls}>
              <span className="inline-flex items-center gap-1.5">
                <Gift className="size-4 text-[#306BD9]" />
                Phúc lợi &amp; Đãi ngộ nổi bật ({benefits.length})
              </span>
            </Label>
            {benefits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {benefits.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] py-1 pr-1.5 pl-2.5 text-[12px] font-semibold text-[#1D4ED8]"
                  >
                    {b}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setBenefits(benefits.filter((x) => x !== b))
                      }
                      aria-label={`Xóa phúc lợi ${b}`}
                      className="size-4 rounded-full p-0 text-[#1D4ED8] hover:bg-[#306BD9]/15"
                    >
                      <X className="size-3" />
                    </Button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={benefitDraft}
                onChange={(e) => setBenefitDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBenefit(benefitDraft);
                  }
                }}
                placeholder="Nhập phúc lợi rồi nhấn Enter..."
                className={fieldCls}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addBenefit(benefitDraft)}
                className="h-10 shrink-0 rounded-[10px] border-[#306BD9] bg-white px-3.5 text-[12.5px] font-bold text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
              >
                Thêm
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BENEFIT_SUGGESTIONS.filter(
                (s) =>
                  !benefits.some((b) => b.toLowerCase() === s.toLowerCase())
              ).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => addBenefit(s)}
                  className="h-6.5 rounded-full border-[#E2E8F0] bg-white px-2 text-[11px] font-medium text-[#475569] hover:border-[#306BD9] hover:bg-white hover:text-[#306BD9]"
                >
                  <Plus className="size-2.5" />
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5 text-[#306BD9]" />
                  Trang LinkedIn
                </span>
              </Label>
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className={fieldCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5 text-[#306BD9]" />
                  Trang Facebook Tuyển dụng
                </span>
              </Label>
              <Input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className={fieldCls}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-10 rounded-full bg-[#306BD9] px-7 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Lưu thay đổi
            </Button>
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
      <PageHeader
        title="Hồ sơ công ty"
        subtitle="Thông tin thương hiệu doanh nghiệp hiển thị cho ứng viên trên các tin tuyển dụng và trang công ty."
      />
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
