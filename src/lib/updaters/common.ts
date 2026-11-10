import type { GatewayRequest, GatewayResponse } from '../../types/http.js';
import { getProvider } from '../providers/index.js';
import type { UnifiedRelease } from '../providers/types.js';
import { getEligibleReleases } from '../semver.js';

export const DEFAULT_CHANNEL = 'stable';
const DEFAULT_PROTOCOL = 'https';

export function resolveBaseUrl(req: GatewayRequest): string {
  const protocolHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host;

  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : (protocolHeader ?? DEFAULT_PROTOCOL);

  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  return `${protocol}://${host}`;
}

export function buildDownloadUrl(baseUrl: string, assetId: string | number): string {
  return `${baseUrl}/api/v1/download?asset_id=${encodeURIComponent(String(assetId))}`;
}

export function getQueryParam(req: GatewayRequest, param: string): string | undefined {
  const val = req.query[param];

  if (Array.isArray(val)) {
    return val[0]?.trim();
  }

  return typeof val === 'string' ? val.trim() : undefined;
}

export function resolveChannel(req: GatewayRequest): {
  channel: string;
  wantPrerelease: boolean;
} {
  const queryChannel = getQueryParam(req, 'channel');
  const headerVal = req.headers['x-update-channel'];
  const headerChannel = Array.isArray(headerVal) ? headerVal[0]?.trim() : headerVal?.trim();

  const channel = (queryChannel ?? headerChannel)?.toLowerCase() ?? DEFAULT_CHANNEL;
  const wantPrerelease = channel !== DEFAULT_CHANNEL;

  return { channel, wantPrerelease };
}

export function resolveFrameworkVersion(
  req: GatewayRequest,
  framework: string,
  defaultVersion: number,
): number {
  // 1. Query parameter ?framework_version= (manual override)
  const queryVersion = getQueryParam(req, 'framework_version');

  if (queryVersion && /^\d+$/.test(queryVersion)) {
    return Number.parseInt(queryVersion, 10);
  }

  // 2. Custom header X-Framework-Version: <number>
  const headerVal = req.headers['x-framework-version'];
  const headerVersion = Array.isArray(headerVal) ? headerVal[0]?.trim() : headerVal?.trim();

  if (headerVersion && /^\d+$/.test(headerVersion)) {
    return Number.parseInt(headerVersion, 10);
  }

  // 3. Standard HTTP Accept header with vendor MIME type, e.g. application/vnd.tauri.v1+json
  const acceptHeader = req.headers.accept;
  const accept = Array.isArray(acceptHeader) ? acceptHeader[0] : acceptHeader;

  if (accept) {
    const acceptRegex = new RegExp(`application/vnd\\.${framework}\\.v(\\d+)\\+json`, 'i');
    const match = acceptRegex.exec(accept);

    if (match?.[1]) {
      return Number.parseInt(match[1], 10);
    }
  }

  // 4. User-Agent heuristic detection
  const uaHeader = req.headers['user-agent'];
  const ua = (Array.isArray(uaHeader) ? uaHeader[0] : uaHeader)?.toLowerCase();

  if (ua && framework.toLowerCase() === 'tauri') {
    if (ua.includes('tauri-plugin-updater')) {
      return 2;
    }

    if (ua.includes('tauri-updater') || ua.includes('tauri/1.') || ua.includes('tauri v1')) {
      return 1;
    }
  }

  // 5. Default fallback
  return defaultVersion;
}

export function handlePreflight(req: GatewayRequest, res: GatewayResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  return null;
}

export async function fetchEligibleReleases(options: {
  wantPrerelease: boolean;
}): Promise<UnifiedRelease[]> {
  const provider = getProvider();
  const releases = await provider.getReleases();

  if (!Array.isArray(releases) || releases.length === 0) {
    return [];
  }

  return getEligibleReleases(releases, options);
}
