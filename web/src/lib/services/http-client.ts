/**
 * Lớp HTTP nền cho mọi dịch vụ bên ngoài (tra cứu MST, danh mục tỉnh thành...).
 * Chỉ dùng ở phía server (route handler / service).
 */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type HttpClientOptions = {
  /** Thời gian chờ tối đa cho mỗi lần gọi (ms). */
  timeoutMs?: number;
  /** Số lần thử lại khi lỗi mạng / timeout / 5xx. */
  retries?: number;
};

export class HttpClient {
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(
    private readonly baseUrl: string,
    options: HttpClientOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.retries = options.retries ?? 1;
  }

  async getJson<T>(path: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await this.fetchOnce<T>(path);
      } catch (err) {
        lastError = err;
        // 4xx là lỗi của yêu cầu, thử lại cũng vô ích.
        if (err instanceof HttpError && err.status && err.status < 500) break;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new HttpError("Không thể kết nối tới dịch vụ bên ngoài.");
  }

  private async fetchOnce<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new HttpError(`Dịch vụ trả về lỗi ${res.status}.`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new HttpError("Dịch vụ phản hồi quá chậm.");
      }
      throw new HttpError("Không thể kết nối tới dịch vụ bên ngoài.");
    } finally {
      clearTimeout(timer);
    }
  }
}
