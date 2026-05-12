export type ResultReviewStatus =
  | "none"
  | "under_review"
  | "overridden"
  | "completed"
  | "resolved";

export interface Result {
  _id: string;
  user_id: string;
  productID: string;
  transaction_id?: string;
  result: string;

  /**
   * Result / annotated image.
   */
  result_image?: string;
  resultImageUrl?: string;
  result_image_url?: string;

  annotated_image?: string;
  annotatedImageUrl?: string;
  annotated_image_url?: string;

  /**
   * Original / raw image.
   */
  original_image?: string;
  originalImageUrl?: string;
  original_image_url?: string;

  raw_image?: string;
  rawImageUrl?: string;
  raw_image_url?: string;

  testedDate?: string;
  createdAt?: string;
  updatedAt?: string;

  review_status?: ResultReviewStatus;
  original_result?: string;
  override_result?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string;
}

export function getEffectiveResult(result?: Partial<Result> | null) {
  const overrideResult = String(result?.override_result ?? "").trim();

  if (overrideResult) return overrideResult;

  return String(result?.result ?? "Pending").trim() || "Pending";
}

export function getAnnotatedImageUrl(result?: Partial<Result> | null) {
  return (
    result?.result_image ||
    result?.annotated_image ||
    result?.resultImageUrl ||
    result?.annotatedImageUrl ||
    result?.result_image_url ||
    result?.annotated_image_url ||
    ""
  );
}

export function getOriginalImageUrl(result?: Partial<Result> | null) {
  const direct =
    result?.original_image ||
    result?.raw_image ||
    result?.originalImageUrl ||
    result?.rawImageUrl ||
    result?.original_image_url ||
    result?.raw_image_url ||
    "";

  if (direct) return direct;

  const annotated = getAnnotatedImageUrl(result);

  /**
   * Fallback for older uploaded sessions:
   * if annotated.png exists, original.png may exist in the same R2 folder.
   */
  if (annotated.includes("annotated.png")) {
    return annotated.replace("annotated.png", "original.png");
  }

  if (annotated.includes("annotated.")) {
    return annotated.replace("annotated.", "original.");
  }

  return annotated;
}

export function getBestDisplayImageUrl(result?: Partial<Result> | null) {
  return getAnnotatedImageUrl(result) || getOriginalImageUrl(result);
}

export function withImageCacheBust(url: string | null | undefined) {
  const raw = String(url || "").trim();

  if (!raw) return "";

  return `${raw}${raw.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

export async function fetchUserResults(
  userId: string,
  options?: RequestInit,
): Promise<Result[]> {
  try {
    const params = new URLSearchParams({ userId });

    const res = await fetch(`/api/results?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
      ...options,
    });

    if (!res.ok) throw new Error("Failed to fetch results");

    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((r: any) => {
      const resultImage = String(
        r?.result_image ||
          r?.annotated_image ||
          r?.resultImageUrl ||
          r?.annotatedImageUrl ||
          r?.result_image_url ||
          r?.annotated_image_url ||
          "",
      );

      const annotatedImage = String(
        r?.annotated_image ||
          r?.result_image ||
          r?.annotatedImageUrl ||
          r?.resultImageUrl ||
          r?.annotated_image_url ||
          r?.result_image_url ||
          resultImage ||
          "",
      );

      const originalImage = String(
        r?.original_image ||
          r?.raw_image ||
          r?.originalImageUrl ||
          r?.rawImageUrl ||
          r?.original_image_url ||
          r?.raw_image_url ||
          "",
      );

      const rawImage = String(
        r?.raw_image ||
          r?.original_image ||
          r?.rawImageUrl ||
          r?.originalImageUrl ||
          r?.raw_image_url ||
          r?.original_image_url ||
          originalImage ||
          "",
      );

      return {
        ...r,

        _id: String(r?._id ?? ""),
        user_id: String(r?.user_id ?? ""),
        productID: String(r?.productID ?? ""),
        transaction_id: r?.transaction_id
          ? String(r.transaction_id)
          : undefined,
        result: String(r?.result ?? "Pending"),

        result_image: resultImage,
        resultImageUrl: resultImage,
        result_image_url: resultImage,

        annotated_image: annotatedImage,
        annotatedImageUrl: annotatedImage,
        annotated_image_url: annotatedImage,

        original_image: originalImage,
        originalImageUrl: originalImage,
        original_image_url: originalImage,

        raw_image: rawImage,
        rawImageUrl: rawImage,
        raw_image_url: rawImage,

        testedDate: r?.testedDate ? String(r.testedDate) : undefined,
        createdAt: r?.createdAt ? String(r.createdAt) : undefined,
        updatedAt: r?.updatedAt ? String(r.updatedAt) : undefined,

        review_status: r?.review_status
          ? (String(r.review_status) as ResultReviewStatus)
          : "none",
        original_result: r?.original_result ? String(r.original_result) : "",
        override_result: r?.override_result ? String(r.override_result) : "",
        reviewed_by: r?.reviewed_by ? String(r.reviewed_by) : null,
        reviewed_at: r?.reviewed_at ? String(r.reviewed_at) : null,
        review_notes: r?.review_notes ? String(r.review_notes) : "",
      };
    });
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.error("fetchUserResults error:", err);
    }

    return [];
  }
}
