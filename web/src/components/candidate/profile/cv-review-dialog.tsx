"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  CandidateProfileRecord,
  CertificationItem,
  CvProfileRecord,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  SkillItem,
} from "@/lib/db/types";
import {
  buildSuggestions,
  type ListField,
  type ScalarField,
  type SuggestionStatus,
} from "@/lib/profile/merge";
import { formatPeriod } from "@/lib/profile/profile-utils";

const STATUS_META: Record<SuggestionStatus, { label: string; cls: string }> = {
  new: { label: "Mới", cls: "bg-[#DCFCE7] text-[#15803D]" },
  different: { label: "Khác hồ sơ", cls: "bg-[#FEF3C7] text-[#B45309]" },
  manual: { label: "Bạn đã tự nhập", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
  same: { label: "Trùng khớp", cls: "bg-[#F1F5F9] text-[#64748B]" },
};

const METHOD_LABEL: Record<string, string> = {
  pymupdf_layout_2col: "Bố cục 2 cột",
  pymupdf_digital: "PDF điện tử",
  tesseract_ocr_vie_eng: "OCR Việt – Anh",
  pymupdf_2col_plus_tesseract_ocr: "2 cột + OCR",
  docx_structured: "Word (.docx)",
};

export function extractionLabel(cv: CvProfileRecord): string {
  return METHOD_LABEL[cv.extraction_method || ""] || "PDF điện tử";
}

export function CvReviewDialog({
  open,
  onOpenChange,
  cv,
  profile,
  user,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cv: CvProfileRecord | null;
  profile: CandidateProfileRecord | null;
  user: { full_name?: string | null; phone?: string | null } | null;
  onApplied: () => Promise<void> | void;
}) {
  const parsed = cv?.parsed_data || null;
  const suggestions = useMemo(
    () => (parsed ? buildSuggestions(profile, user, parsed) : { scalars: [], lists: [] }),
    [parsed, profile, user]
  );

  const initialScalar = () =>
    Object.fromEntries(
      suggestions.scalars.map((s) => [s.field, { apply: s.defaultApply, value: s.incoming }])
    ) as Record<ScalarField, { apply: boolean; value: string }>;
  const initialList = () =>
    Object.fromEntries(
      suggestions.lists.map((l) => [
        l.field,
        new Set(l.items.filter((i) => i.defaultApply).map((i) => i.key)),
      ])
    ) as Record<ListField, Set<string>>;

  const [scalarState, setScalarState] = useState(initialScalar);
  const [listState, setListState] = useState(initialList);
  const [submitting, setSubmitting] = useState(false);
  // Lưu ý: component cha truyền `key` theo id CV + lần mở để khởi tạo lại lựa chọn mỗi lần mở hộp thoại.

  const visibleScalars = suggestions.scalars.filter((s) => s.status !== "same");
  const sameScalars = suggestions.scalars.filter((s) => s.status === "same");

  const selectedCount =
    visibleScalars.filter((s) => scalarState[s.field]?.apply).length +
    suggestions.lists.reduce((acc, l) => acc + (listState[l.field]?.size || 0), 0);

  function preset(mode: "all" | "empty" | "none") {
    setScalarState((prev) => {
      const next = { ...prev };
      for (const s of visibleScalars) {
        next[s.field] = {
          ...next[s.field],
          apply: mode === "all" ? true : mode === "empty" ? s.status === "new" : false,
        };
      }
      return next;
    });
    setListState(() => {
      const next = {} as Record<ListField, Set<string>>;
      for (const l of suggestions.lists) {
        next[l.field] = new Set(
          mode === "none" ? [] : l.items.filter((i) => i.isNew).map((i) => i.key)
        );
      }
      return next;
    });
  }

  function toggleItem(field: ListField, key: string) {
    setListState((prev) => {
      const set = new Set(prev[field] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [field]: set };
    });
  }

  async function submit() {
    if (!cv) return;
    const set: Record<string, string> = {};
    for (const s of visibleScalars) {
      const st = scalarState[s.field];
      if (st?.apply && st.value.trim()) set[s.field] = st.value.trim();
    }
    const add: Record<string, unknown[]> = {};
    for (const l of suggestions.lists) {
      const chosen = listState[l.field];
      const items = l.items.filter((i) => i.isNew && chosen?.has(i.key)).map((i) => i.item);
      if (items.length) add[l.field] = items;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/candidate-profile/apply-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_id: cv.id, set, add }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể cập nhật hồ sơ.");
        return;
      }
      toast.success(data.message || "Đã cập nhật hồ sơ từ CV.");
      await onApplied();
      onOpenChange(false);
    } catch {
      toast.error("Lỗi kết nối khi cập nhật hồ sơ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto rounded-[18px] p-0 sm:max-w-4xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-[#EBEBEB] bg-white px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-[18px] font-extrabold text-[#222222]">
            <Sparkles className="size-5 text-[#306BD9]" />
            Xem lại thông tin bóc tách từ CV
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#666666]">
            Chọn những thông tin muốn cập nhật vào hồ sơ. Bạn có thể sửa trực tiếp trước khi lưu.
            Dữ liệu bạn đã tự nhập sẽ không bị ghi đè nếu bạn không chọn.
          </DialogDescription>
          {cv && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 font-semibold text-[#334155]">
                <FileText className="size-3" />
                {cv.file_name}
              </span>
              <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 font-bold text-[#1D4ED8]">
                {extractionLabel(cv)}
              </span>
              {cv.processing_time_ms ? (
                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[#475569]">
                  {Math.round(cv.processing_time_ms)} ms
                </span>
              ) : null}
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[#475569]">
                {cv.parser_version || "cv-parser"}
              </span>
            </div>
          )}
        </DialogHeader>

        {!parsed ? (
          <div className="px-6 py-10 text-center text-[13px] text-[#666666]">
            CV này được lưu bằng phiên bản cũ, chưa có dữ liệu cấu trúc. Hãy bấm{" "}
            <strong>“Bóc tách lại”</strong> trên thẻ CV rồi thử lại.
          </div>
        ) : (
          <div className="space-y-5 px-5 pb-4 sm:px-6">
            {parsed.warnings.length > 0 && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[12.5px] text-[#92400E]">
                {parsed.warnings.map((w) => (
                  <p key={w} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => preset("all")} className="rounded-lg border border-[#306BD9] bg-[#EBF2FF] px-3 py-1.5 text-[12px] font-bold text-[#306BD9] hover:bg-[#DCE8FF]">
                Chọn tất cả gợi ý
              </button>
              <button type="button" onClick={() => preset("empty")} className="rounded-lg border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-bold text-[#334155] hover:bg-[#F5F7FA]">
                Chỉ điền trường còn trống
              </button>
              <button type="button" onClick={() => preset("none")} className="rounded-lg border border-[#D9D9D9] px-3 py-1.5 text-[12px] font-bold text-[#64748B] hover:bg-[#F5F7FA]">
                Bỏ chọn tất cả
              </button>
            </div>

            {/* THÔNG TIN CÁ NHÂN */}
            {visibleScalars.length > 0 && (
              <section className="rounded-[14px] border border-[#E2E8F0]">
                <h3 className="flex items-center gap-2 border-b border-[#EBEBEB] bg-[#F8FAFC] px-4 py-2.5 text-[13.5px] font-extrabold text-[#222222]">
                  <UserRound className="size-4 text-[#306BD9]" /> Thông tin cá nhân & giới thiệu
                </h3>
                <div className="divide-y divide-[#F1F5F9]">
                  {visibleScalars.map((s) => {
                    const st = scalarState[s.field] || { apply: false, value: s.incoming };
                    const meta = STATUS_META[s.status];
                    const isLong = s.field === "summary";
                    return (
                      <div key={s.field} className="grid gap-2 px-4 py-3 sm:grid-cols-[22px_150px_1fr]">
                        <input
                          type="checkbox"
                          checked={st.apply}
                          onChange={(e) =>
                            setScalarState((prev) => ({ ...prev, [s.field]: { ...st, apply: e.target.checked } }))
                          }
                          className="mt-1 size-4 accent-[#306BD9]"
                          aria-label={`Áp dụng ${s.label}`}
                        />
                        <div>
                          <p className="text-[12.5px] font-bold text-[#222222]">{s.label}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                            {s.confidence !== null && s.confidence < 0.7 && (
                              <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">Cần kiểm tra</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 space-y-1">
                          {s.current && (
                            <p className="truncate text-[11.5px] text-[#94A3B8]">
                              Hiện tại: <span className="line-through">{s.current}</span>
                            </p>
                          )}
                          {isLong ? (
                            <textarea
                              value={st.value}
                              onChange={(e) =>
                                setScalarState((prev) => ({ ...prev, [s.field]: { apply: true, value: e.target.value } }))
                              }
                              rows={3}
                              className="w-full rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 text-[12.5px] focus:border-[#306BD9] focus:outline-none"
                            />
                          ) : (
                            <input
                              value={st.value}
                              onChange={(e) =>
                                setScalarState((prev) => ({ ...prev, [s.field]: { apply: true, value: e.target.value } }))
                              }
                              className="h-8 w-full rounded-lg border border-[#D9D9D9] px-2.5 text-[12.5px] focus:border-[#306BD9] focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sameScalars.length > 0 && (
                  <p className="border-t border-[#F1F5F9] px-4 py-2 text-[11.5px] text-[#64748B]">
                    <CheckCircle2 className="mr-1 inline size-3.5 text-[#16A34A]" />
                    {sameScalars.length} trường đã khớp với hồ sơ: {sameScalars.map((s) => s.label).join(", ")}
                  </p>
                )}
              </section>
            )}

            {/* DANH SÁCH */}
            {suggestions.lists.map((l) => {
              const chosen = listState[l.field] || new Set<string>();
              const newCount = l.items.filter((i) => i.isNew).length;
              const icon =
                l.field === "experiences" ? Briefcase : l.field === "educations" ? GraduationCap : l.field === "languages" ? Languages : Sparkles;
              const Icon = icon;
              return (
                <section key={l.field} className="rounded-[14px] border border-[#E2E8F0]">
                  <h3 className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBEBEB] bg-[#F8FAFC] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#222222]">
                      <Icon className="size-4 text-[#306BD9]" /> {l.label}
                    </span>
                    <span className="text-[11.5px] text-[#64748B]">
                      {newCount} mục mới · {l.items.length - newCount} đã có trong hồ sơ
                    </span>
                  </h3>

                  {l.field === "skills" ? (
                    <div className="flex flex-wrap gap-1.5 p-4">
                      {l.items.map((i) => {
                        const sk = i.item as SkillItem;
                        const on = chosen.has(i.key);
                        if (!i.isNew) {
                          return (
                            <span key={i.key} className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[11.5px] font-semibold text-[#15803D]">
                              ✓ {sk.name}
                            </span>
                          );
                        }
                        return (
                          <button
                            key={i.key}
                            type="button"
                            onClick={() => toggleItem("skills", i.key)}
                            title={sk.source === "inferred" ? "Suy luận từ mô tả kinh nghiệm/dự án" : sk.category}
                            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                              on
                                ? "border-[#306BD9] bg-[#306BD9] text-white"
                                : "border-[#CBD5E1] bg-white text-[#475569] hover:border-[#306BD9]"
                            } ${sk.source === "inferred" ? "border-dashed" : ""}`}
                          >
                            {sk.name}
                            {sk.type === "soft" && <span className="ml-1 opacity-75">(mềm)</span>}
                          </button>
                        );
                      })}
                      <p className="mt-1 w-full text-[11px] text-[#94A3B8]">
                        Viền nét đứt: kỹ năng được suy luận từ mô tả công việc/dự án. Bấm để chọn/bỏ.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {l.items.map((i) => (
                        <label key={i.key} className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${!i.isNew ? "opacity-60" : ""}`}>
                          <input
                            type="checkbox"
                            disabled={!i.isNew}
                            checked={i.isNew ? chosen.has(i.key) : true}
                            onChange={() => toggleItem(l.field, i.key)}
                            className="mt-1 size-4 accent-[#306BD9]"
                          />
                          <div className="min-w-0 flex-1 text-[12.5px]">
                            <ListItemPreview field={l.field} item={i.item} />
                            <div className="mt-1 flex gap-1">
                              {!i.isNew && <span className="rounded-full bg-[#F0FDF4] px-1.5 py-0.5 text-[10px] font-bold text-[#15803D]">Đã có trong hồ sơ</span>}
                              {i.lowConfidence && <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">Cần kiểm tra</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[#EBEBEB] bg-white px-5 py-3 sm:px-6">
          <p className="text-[12px] text-[#64748B]">
            Đã chọn <strong className="text-[#306BD9]">{selectedCount}</strong> mục
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg text-[12.5px] font-bold">
              Bỏ qua, chỉ lưu CV
            </Button>
            <Button
              disabled={!parsed || submitting || selectedCount === 0}
              onClick={submit}
              className="rounded-lg bg-[#306BD9] text-[12.5px] font-bold text-white hover:bg-[#2456B6]"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Cập nhật {selectedCount} mục vào hồ sơ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListItemPreview({ field, item }: { field: ListField; item: unknown }) {
  if (field === "experiences") {
    const e = item as ExperienceItem;
    return (
      <>
        <p className="font-bold text-[#222222]">
          {e.position || "Vị trí chưa rõ"}
          {e.company && <span className="font-semibold text-[#306BD9]"> · {e.company}</span>}
        </p>
        <p className="text-[11.5px] text-[#64748B]">
          {formatPeriod(e.start, e.end, e.is_current)}
          {e.duration_months ? ` · ${e.duration_months} tháng` : ""}
        </p>
        {e.description?.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-[11.5px] text-[#475569]">
            {e.description.slice(0, 3).map((d) => (
              <li key={d}>{d}</li>
            ))}
            {e.description.length > 3 && <li className="list-none text-[#94A3B8]">+{e.description.length - 3} ý khác</li>}
          </ul>
        )}
      </>
    );
  }
  if (field === "educations") {
    const e = item as EducationItem;
    return (
      <>
        <p className="font-bold text-[#222222]">{e.school || "Trường chưa rõ"}</p>
        <p className="text-[11.5px] text-[#64748B]">
          {[e.degree, e.major, formatPeriod(e.start, e.end), e.gpa && `GPA ${e.gpa}`, e.status].filter(Boolean).join(" · ")}
        </p>
      </>
    );
  }
  if (field === "projects") {
    const p = item as ProjectItem;
    return (
      <>
        <p className="font-bold text-[#222222]">{p.name}</p>
        {p.description && <p className="line-clamp-2 text-[11.5px] text-[#475569]">{p.description}</p>}
        {p.technologies.length > 0 && <p className="text-[11px] text-[#306BD9]">{p.technologies.join(", ")}</p>}
      </>
    );
  }
  if (field === "certifications") {
    const c = item as CertificationItem;
    return (
      <p className="font-semibold text-[#222222]">
        {c.name} {c.score && <span className="text-[#306BD9]">{c.score}</span>} {c.year && <span className="text-[#64748B]">({c.year})</span>}
      </p>
    );
  }
  const l = item as LanguageItem;
  return (
    <p className="font-semibold text-[#222222]">
      {l.language} {l.level && <span className="text-[#64748B]">— {l.level}</span>}
    </p>
  );
}
