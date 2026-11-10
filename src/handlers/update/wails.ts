import semver from 'semver';

import { getProvider } from '../../lib/providers/index.js';
import {
  buildDownloadUrl,
  fetchEligibleReleases,
  getQueryParam,
  handlePreflight,
  resolveBaseUrl,
  resolveChannel,
} from '../../lib/updaters/common.js';
import { type WailsManifest, findWailsPlatforms } from '../../lib/updaters/wails.js';
import type { GatewayRequest, GatewayResponse } from '../../types/http.js';

export async function updateWailsHandler(req: GatewayRequest, res: GatewayResponse) {
  const preflightResponse = handlePreflight(req, res);

  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const rawPlatform = getQueryParam(req, 'platform');
    const rawArch = getQueryParam(req, 'arch');
    const rawVersion = getQueryParam(req, 'version');
    const isManifestMode =
      getQueryParam(req, 'manifest') === 'true' || Boolean(getQueryParam(req, 'file'));

    const { wantPrerelease } = resolveChannel(req);
    const eligibleReleases = await fetchEligibleReleases({ wantPrerelease });

    if (eligibleReleases.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

      return isManifestMode
        ? res.status(404).send('No eligible releases found')
        : res.status(204).end();
    }

    const candidate = eligibleReleases[0];
    const candidateVersion = candidate.tagName.replace(/^v/, '').trim();

    // Check version if version was passed and not in static manifest mode
    if (rawVersion && !isManifestMode) {
      const cleanCurrentVersion = rawVersion.replace(/^v/, '').trim();
      const validCurrent = semver.valid(cleanCurrentVersion);
      const validCandidate = semver.valid(candidateVersion);

      if (validCurrent && validCandidate) {
        if (semver.lte(validCandidate, validCurrent)) {
          res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

          return res.status(204).end();
        }
      } else if (candidateVersion === cleanCurrentVersion) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

        return res.status(204).end();
      }
    }

    const matched = findWailsPlatforms(candidate.assets ?? [], rawPlatform, rawArch);

    if (matched.length === 0) {
      return res.status(404).send('No suitable Wails release assets found');
    }

    const baseUrl = resolveBaseUrl(req);
    const provider = getProvider();

    const platformEntries = await Promise.all(
      matched.map(async item => {
        let signature = '';
        let sha256 = '';

        if (item.sigAsset) {
          signature = await provider.getAssetSignature(item.sigAsset);
        }

        if (item.shaAsset) {
          const rawSha = await provider.getAssetSignature(item.shaAsset);
          // Extracts the first 64-char hex string
          const match = /[a-fA-F0-9]{64}/.exec(rawSha);

          if (match) {
            [sha256 = ''] = match;
          }
        }

        return [
          item.platformKey,
          {
            sha256: sha256 || undefined,
            signature: signature || undefined,
            size: item.binaryAsset.size,
            url: buildDownloadUrl(baseUrl, item.binaryAsset.id),
          },
        ] as const;
      }),
    );

    const platformsMap: WailsManifest['platforms'] = Object.fromEntries(platformEntries);

    const manifest: WailsManifest = {
      notes: candidate.body,
      platforms: platformsMap,
      pub_date: candidate.publishedAt ?? '',
      version: candidateVersion,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Vary', 'Origin, X-Update-Channel');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json(manifest);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
