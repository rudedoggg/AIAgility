function normalizeApiUrl(raw: string): string {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `https://${raw}`;
}

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_BASE_URL || "");
