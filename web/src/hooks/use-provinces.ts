"use client";

import { useQuery } from "@tanstack/react-query";
import type { Province } from "@/lib/services/location-types";

/** Danh mục 34 tỉnh/thành lấy từ API (qua route proxy có cache). */
export function useProvinces() {
  return useQuery({
    queryKey: ["provinces"],
    queryFn: async (): Promise<Province[]> => {
      const res = await fetch("/api/locations/provinces");
      if (!res.ok) throw new Error("Không tải được danh mục tỉnh/thành.");
      const data = (await res.json()) as { provinces: Province[] };
      return data.provinces;
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}
