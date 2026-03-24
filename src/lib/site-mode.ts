export type SiteRole = "primary" | "mirror";

const DEFAULT_MIRROR_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DATA_DIR = "var";
const DEFAULT_SYNC_TIME_ZONE = "Asia/Shanghai";
const DEFAULT_SYNC_SCHEDULE = "0 8 * * *";
const DEFAULT_FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_FEEDBACK_RATE_LIMIT_MAX = 5;

function normalizeBoolean(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function getSiteRole(): SiteRole {
  return process.env.SITE_ROLE === "mirror" ? "mirror" : "primary";
}

export function isMirrorSite(): boolean {
  return getSiteRole() === "mirror";
}

export function isSyncEnabled(): boolean {
  const normalized = normalizeBoolean(process.env.SYNC_ENABLED);
  if (normalized !== null) {
    return normalized;
  }

  return true;
}

export function getDictionaryUpstreamUrl(): string | null {
  const configured = process.env.DICTIONARY_UPSTREAM_URL?.trim();
  if (configured) {
    return configured;
  }

  const siteUrl = getSiteUrl();
  return siteUrl ? `${siteUrl}/api/dictionary/current` : null;
}

export function getSiteUrl(): string | null {
  const value = process.env.SITE_URL?.trim();
  if (!value) {
    return null;
  }

  return value.replace(/\/+$/u, "");
}

export function getStorageDriver(): "filesystem" | "blob" {
  return process.env.STORAGE_DRIVER === "blob" ? "blob" : "filesystem";
}

export function getDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  return configured || DEFAULT_DATA_DIR;
}

export function getAdminSyncToken(): string | null {
  const configured = process.env.ADMIN_SYNC_TOKEN?.trim();
  if (configured) {
    return configured;
  }

  const legacy = process.env.CRON_SECRET?.trim();
  return legacy || null;
}

export function getSyncTimeZone(): string {
  const configured = process.env.SYNC_TZ?.trim();
  return configured || DEFAULT_SYNC_TIME_ZONE;
}

export function getSyncSchedule(): string {
  const configured = process.env.SYNC_SCHEDULE?.trim();
  return configured || DEFAULT_SYNC_SCHEDULE;
}

export function isQueryLoggingEnabled(): boolean {
  const normalized = normalizeBoolean(process.env.QUERY_LOGGING_ENABLED);
  if (normalized !== null) {
    return normalized;
  }

  return true;
}

export function getFeedbackRateLimitWindowMs(): number {
  const raw = Number.parseInt(process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_FEEDBACK_RATE_LIMIT_WINDOW_MS;
  }

  return raw;
}

export function getFeedbackRateLimitMax(): number {
  const raw = Number.parseInt(process.env.FEEDBACK_RATE_LIMIT_MAX ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_FEEDBACK_RATE_LIMIT_MAX;
  }

  return raw;
}

export function getMirrorCachePath(): string {
  const configured = process.env.MIRROR_CACHE_PATH?.trim();
  if (configured) {
    return configured;
  }

  return `${getDataDir()}/mirror/current.json`;
}

export function getMirrorCacheTtlMs(): number {
  const raw = Number.parseInt(process.env.MIRROR_CACHE_TTL_MS ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MIRROR_CACHE_TTL_MS;
  }

  return raw;
}
