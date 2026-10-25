import { HttpClient, HttpError } from "./http-client";
import { TtlCache } from "./ttl-cache";
import { locationService } from "./location-service";
import { findProvinceInAddress } from "./location-types";
import {
  normalizeTaxCode,
  type TaxCompany,
  type TaxErrorCode,
} from "./tax-types";
import { removeVietnameseTones } from "@/lib/utils";

export class TaxLookupError extends Error {
  constructor(
    readonly code: TaxErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TaxLookupError";
  }

  get httpStatus(): number {
    switch (this.code) {
      case "INVALID_FORMAT":
        return 400;
      case "NOT_FOUND":
        return 404;
      case "INACTIVE":
        return 422;
      default:
        return 503;
    }
  }
}

type RawTaxCompany = {
  id: string;
  name: string;
  shortName: string | null;
  address: string;
  status: string;
};

/** Hợp đồng chung cho mọi nhà cung cấp tra cứu MST. */
export interface TaxProvider {
  readonly name: string;
  lookup(taxCode: string): Promise<RawTaxCompany | null>;
}

/**
 * VietQR Business API (miễn phí, không cần key) – dữ liệu từ Tổng cục Thuế (gdt.gov.vn).
 * `code`: "00" thành công, "51" không tồn tại, "52" MST không chính xác.
 */
export class VietQrTaxProvider implements TaxProvider {
  readonly name = "api.vietqr.io";
  private readonly http = new HttpClient("https://api.vietqr.io", {
    timeoutMs: 10000,
    retries: 1,
  });

  async lookup(taxCode: string): Promise<RawTaxCompany | null> {
    try {
      const res = await this.http.getJson<{
        code: string;
        data: RawTaxCompany | null;
      }>(`/v2/business/${encodeURIComponent(taxCode)}`);
      if (res.code === "00" && res.data) return res.data;
      if (res.code === "51" || res.code === "52") return null;
      throw new TaxLookupError("UNAVAILABLE", "Dịch vụ tra cứu MST tạm thời không khả dụng.");
    } catch (err) {
      if (err instanceof TaxLookupError) throw err;
      if (err instanceof HttpError) {
        throw new TaxLookupError(
          "UNAVAILABLE",
          "Không kết nối được dịch vụ tra cứu MST. Vui lòng thử lại."
        );
      }
      throw err;
    }
  }
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

export class TaxLookupService {
  private readonly cache = new TtlCache<TaxCompany>("tax_lookup", WEEK);

  constructor(private readonly provider: TaxProvider = new VietQrTaxProvider()) {}

  /**
   * Tra cứu doanh nghiệp theo MST.
   * @param requireActive true: ném lỗi INACTIVE nếu doanh nghiệp không còn hoạt động.
   */
  async lookup(rawTaxCode: string, requireActive = true): Promise<TaxCompany> {
    const taxCode = normalizeTaxCode(rawTaxCode);
    if (!taxCode) {
      throw new TaxLookupError(
        "INVALID_FORMAT",
        "Mã số thuế gồm 10 chữ số (hoặc 13 chữ số với chi nhánh)."
      );
    }

    let company = this.cache.get(taxCode);
    if (!company) {
      const raw = await this.provider.lookup(taxCode);
      if (!raw) {
        throw new TaxLookupError("NOT_FOUND", "Mã số thuế không tồn tại.");
      }
      const { provinces } = await locationService.provinces();
      company = {
        taxCode,
        name: raw.name.trim(),
        shortName: raw.shortName?.trim() || null,
        address: raw.address.trim(),
        status: raw.status.trim(),
        isActive: removeVietnameseTones(raw.status).startsWith("nnt dang hoat dong"),
        province: findProvinceInAddress(raw.address, provinces)?.name ?? null,
      };
      this.cache.set(taxCode, company);
    }

    if (requireActive && !company.isActive) {
      throw new TaxLookupError(
        "INACTIVE",
        `Doanh nghiệp không ở trạng thái hoạt động (${company.status}).`
      );
    }
    return company;
  }
}

export const taxLookupService = new TaxLookupService();
