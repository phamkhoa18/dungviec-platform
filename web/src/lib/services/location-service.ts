import { HttpClient } from "./http-client";
import { TtlCache } from "./ttl-cache";
import { FALLBACK_PROVINCES } from "./provinces-fallback";
import { toProvince, type Province, type RawProvince } from "./location-types";

/** Hợp đồng chung cho mọi nhà cung cấp danh mục tỉnh/thành. */
export interface LocationProvider {
  readonly name: string;
  provinces(): Promise<RawProvince[]>;
}

/** Nhà cung cấp chính: provinces.open-api.vn (phiên bản 2 – sau sáp nhập 34 tỉnh/thành). */
export class OpenApiVnProvider implements LocationProvider {
  readonly name = "provinces.open-api.vn";
  private readonly http = new HttpClient("https://provinces.open-api.vn", {
    timeoutMs: 8000,
    retries: 1,
  });

  async provinces(): Promise<RawProvince[]> {
    const data = await this.http.getJson<{ code: number; name: string }[]>("/api/v2/");
    return data.map((p) => ({ code: p.code, name: p.name }));
  }
}

/** Nhà cung cấp dự phòng: esgoo.net (34 tỉnh/thành mới). */
export class EsgooProvider implements LocationProvider {
  readonly name = "esgoo.net";
  private readonly http = new HttpClient("https://esgoo.net", {
    timeoutMs: 8000,
    retries: 0,
  });

  async provinces(): Promise<RawProvince[]> {
    const res = await this.http.getJson<{
      error: number;
      data: { code: string; full_name: string }[] | null;
    }>("/api-tinhthanh-new/1/0.htm");
    if (res.error !== 0 || !res.data) throw new Error("esgoo: không có dữ liệu");
    return res.data.map((p) => ({ code: Number(p.code), name: p.full_name }));
  }
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Dịch vụ danh mục địa phương: thử lần lượt các nhà cung cấp, cache 24 giờ,
 * cuối cùng dùng danh sách dự phòng đóng gói sẵn để hệ thống không bao giờ trống.
 */
export class LocationService {
  private readonly cache = new TtlCache<Province[]>("provinces", DAY);

  constructor(
    private readonly providers: LocationProvider[] = [
      new OpenApiVnProvider(),
      new EsgooProvider(),
    ]
  ) {}

  async provinces(): Promise<{ provinces: Province[]; source: string }> {
    const cached = this.cache.get("all");
    if (cached) return { provinces: cached, source: "cache" };

    for (const provider of this.providers) {
      try {
        const raw = await provider.provinces();
        if (raw.length >= 30) {
          const list = raw.map(toProvince);
          this.cache.set("all", list);
          return { provinces: list, source: provider.name };
        }
      } catch {
        // Thử nhà cung cấp tiếp theo.
      }
    }
    return { provinces: FALLBACK_PROVINCES.map(toProvince), source: "fallback" };
  }
}

export const locationService = new LocationService();
