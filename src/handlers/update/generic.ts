import semver from 'semver';

import type { UnifiedAsset } from '../../lib/providers/types.js';
import {
  buildDownloadUrl,
  fetchEligibleReleases,
  getQueryParam,
  handlePreflight,
  resolveBaseUrl,
  resolveChannel,
} from '../../lib/updaters/common.js';
import type { GatewayRequest, GatewayResponse } from '../../types/http.js';

export interface GenericUpdateResponse {
  asset?: {
    checksum?: string;
    content_type?: string;
    download_url: string;
    name: string;
    size?: number;
  };
  critical?: boolean;
  current_version?: string;
  has_update: boolean;
  latest_version: string;
  published_at?: string;
  release_notes?: string;
  release_notes_url?: string;
}

export async function updateGenericHandler(req: GatewayRequest, res: GatewayResponse) {
  const preflightResponse = handlePreflight(req, res);

  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const rawVersion = (
      getQueryParam(req, 'current_version') ?? getQueryParam(req, 'version')
    )?.trim();

    const target = (
      getQueryParam(req, 'target') ??
      getQueryParam(req, 'platform') ??
      getQueryParam(req, 'os')
    )?.toLowerCase();

    const arch = getQueryParam(req, 'arch')?.toLowerCase();

    const { wantPrerelease } = resolveChannel(req);
    const eligibleReleases = await fetchEligibleReleases({ wantPrerelease });

    if (eligibleReleases.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

      return res.status(200).json({
        current_version: rawVersion,
        has_update: false,
        latest_version: rawVersion ?? '0.0.0',
      });
    }

    const candidate = eligibleReleases[0];
    const candidateVersion = candidate.tagName.replace(/^v/, '').trim();

    let shouldUpdate = true;

    if (rawVersion) {
      const cleanCurrent = rawVersion.replace(/^v/, '').trim();
      const parsedCurrent = semver.valid(cleanCurrent);
      const parsedCandidate = semver.valid(candidateVersion);

      shouldUpdate =
        parsedCurrent && parsedCandidate
          ? semver.gt(parsedCandidate, parsedCurrent)
          : candidateVersion !== cleanCurrent;
    }

    if (!shouldUpdate) {
      res.setHeader('Vary', 'Origin, X-Update-Channel');
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

      return res.status(200).json({
        current_version: rawVersion,
        has_update: false,
        latest_version: candidateVersion,
      });
    }

    const baseUrl = resolveBaseUrl(req);
    const assets = candidate.assets ?? [];

    let matchedAsset: UnifiedAsset | null = null;

    if (target || arch) {
      matchedAsset =
        assets.find(a => {
          const name = a.name.toLowerCase();

          // Exclude manifest/metadata files
          if (
            name.endsWith('.sig') ||
            name.endsWith('.sha256') ||
            name.endsWith('.sha512') ||
            name.endsWith('.json') ||
            name.endsWith('.yml')
          ) {
            return false;
          }

          const targetMatch = !target || name.includes(target);
          const archMatch = !arch || name.includes(arch);

          return targetMatch && archMatch;
        }) ?? null;
    }

    // Fall back to first non-metadata binary asset if target wasn't specified or matched
    matchedAsset ??=
      assets.find(
        a =>
          !a.name.endsWith('.sig') &&
          !a.name.endsWith('.sha256') &&
          !a.name.endsWith('.sha512') &&
          !a.name.endsWith('.json') &&
          !a.name.endsWith('.yml'),
      ) ?? null;

    const response: GenericUpdateResponse = {
      critical: false,
      current_version: rawVersion,
      has_update: true,
      latest_version: candidateVersion,
      published_at: candidate.publishedAt ?? undefined,
      release_notes: candidate.body || undefined,
      release_notes_url: `${baseUrl}/api/v1/release-notes/${encodeURIComponent(candidateVersion)}`,
    };

    if (matchedAsset) {
      response.asset = {
        content_type: matchedAsset.contentType,
        download_url: buildDownloadUrl(baseUrl, matchedAsset.id),
        name: matchedAsset.name,
        size: matchedAsset.size,
      };
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Vary', 'Origin, X-Update-Channel');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
