/**
 * 可手動推進的假時鐘，僅供測試使用。
 * now() 回傳 ISO 8601 字串（秒精度，結尾為 Z），例如 '2026-06-15T12:00:00Z'。
 */
export class FakeClock {
  private ms: number;

  constructor(startIso: string = '2026-06-15T12:00:00Z') {
    this.ms = Date.parse(startIso);
  }

  now = (): string => new Date(this.ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

  nowMs = (): number => this.ms;

  setTime(iso: string): void {
    this.ms = Date.parse(iso);
  }

  advanceMinutes(n: number): void {
    this.ms += n * 60_000;
  }

  advanceSeconds(n: number): void {
    this.ms += n * 1_000;
  }
}
