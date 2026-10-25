"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { BadgeCheck, Building2, Loader2, MapPin, RotateCw, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeTaxCode, type TaxCompany } from "@/lib/services/tax-types";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  query: UseQueryResult<TaxCompany, Error>;
  inputClassName?: string;
  labelClassName?: string;
};

/**
 * Ô nhập MST kèm kết quả tra cứu: tên công ty, địa chỉ, tỉnh/thành và trạng thái
 * đều lấy từ API (chỉ đọc, người dùng không phải nhập tay).
 */
export function TaxLookupField({
  value,
  onChange,
  query,
  inputClassName,
  labelClassName,
}: Props) {
  const normalized = normalizeTaxCode(value);
  const company = query.data;
  const showFormatHint = value.trim().length > 0 && !normalized && !query.isFetching;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tax_code" className={labelClassName}>
          Mã số thuế doanh nghiệp
        </Label>
        <div className="relative">
          <Input
            id="tax_code"
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d-]/g, ""))}
            placeholder="VD: 0101243150"
            aria-invalid={showFormatHint || query.isError}
            className={cn("pr-11 tracking-wide", inputClassName)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">
            {query.isFetching ? (
              <Loader2 className="size-4 animate-spin text-[#306BD9]" />
            ) : company?.isActive ? (
              <BadgeCheck className="size-5 text-[#16A34A]" />
            ) : query.isError || (company && !company.isActive) ? (
              <XCircle className="size-5 text-[#DC2626]" />
            ) : null}
          </span>
        </div>
        {showFormatHint && (
          <p role="alert" className="text-[12.5px] font-medium text-[#DC2626]">
            MST gồm 10 chữ số (hoặc 13 chữ số với chi nhánh).
          </p>
        )}
        {!value && (
          <p className="text-[12.5px] text-[#777777]">
            Hệ thống tự điền tên và địa chỉ công ty từ dữ liệu Tổng cục Thuế.
          </p>
        )}
      </div>

      {query.isFetching && (
        <p className="text-[13px] text-[#666666]">Đang tra cứu mã số thuế...</p>
      )}

      {query.isError && !query.isFetching && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl bg-[#FEF2F2] px-3.5 py-3 text-[13px] font-medium text-[#DC2626]"
        >
          <span>{query.error.message}</span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="flex shrink-0 items-center gap-1 font-bold underline-offset-2 hover:underline"
          >
            <RotateCw className="size-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {company && !query.isFetching && (
        <div
          className={cn(
            "rounded-xl border p-3.5",
            company.isActive
              ? "border-[#BBF7D0] bg-[#F0FDF4]"
              : "border-[#FECACA] bg-[#FEF2F2]"
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#306BD9] shadow-xs">
              <Building2 className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] leading-5 font-bold text-[#111111]">{company.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-[18px] text-[#555555]">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>{company.address}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5",
                company.isActive
                  ? "bg-[#DCFCE7] text-[#15803D]"
                  : "bg-[#FEE2E2] text-[#B91C1C]"
              )}
            >
              {company.status}
            </span>
            {company.province && (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[#306BD9]">
                {company.province}
              </span>
            )}
            <span className="ml-auto text-[11.5px] font-normal text-[#777777]">
              Nguồn: Tổng cục Thuế
            </span>
          </div>
          {!company.isActive && (
            <p className="mt-2.5 text-[12.5px] font-medium text-[#B91C1C]">
              Chỉ doanh nghiệp đang hoạt động mới đăng ký được tài khoản nhà tuyển dụng.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
