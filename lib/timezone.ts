export function getStoredTimezone(): string {
  if (typeof window === "undefined") return "UTC"
  return localStorage.getItem("timezone") ?? "UTC"
}

export function saveTimezone(tz: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("timezone", tz)
}
