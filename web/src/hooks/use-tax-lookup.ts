"use client";

import { useQuery } from "@tanstack/react-query";
import {
  normalizeTaxCode,
  type TaxCompany,
  type TaxErrorCode,
} from "@/lib/services/tax-types";

export class TaxLookupClientError extends Error {
  constructor(
    readonly code: TaxErrorCode,
    message: string
  ) {
    super(message);
  }
}

/**
 * Tra cứu doanh nghiệp theo MST. Chỉ gọi khi MST đã đúng định dạng (10 hoặc 13 số).
 * Không tự thử lại để người dùng thấy lỗi ngay; có nút "Thử lại" ở giao diện.
 */
export function useTaxLookup(rawTaxCode: string) {
  const taxCode = normalizeTaxCode(rawTaxCode);
  return useQuery({
    queryKey: ["tax-lookup", taxCode],
    enabled: !!taxCode,
    retry: false,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<TaxCompany> => {
      const res = await fetch(`/api/lookup/tax/${encodeURIComponent(taxCode!)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new TaxLookupClientError(
          (data.code as TaxErrorCode) || "UNAVAILABLE",
          data.error || "Không tra cứu được mã số thuế."
        );
      }
      return data.company as TaxCompany;
    },
  });
}
