import semver from 'semver';

import { getProvider } from '../../lib/providers/index.js';
import type { UnifiedAsset } from '../../lib/providers/types.js';
import {
  buildDownloadUrl,
  fetchEligibleReleases,
  getQueryParam,
  handlePreflight,
  resolveBaseUrl,
  resolveChannel,
  resolveFrameworkVersion,
} from '../../lib/updaters/common.js';
import {
  type TauriUpdateResponse,
  type TauriV1UpdateResponse,
  findReleaseAssets,
} from '../../lib/updaters/tauri.js';
import type { GatewayRequest, GatewayResponse } from '../../types/http.js';

export async function updateTauriHandler(req: GatewayRequest, res: GatewayResponse) {
  const preflightResponse = handlePreflight(req, res);

  if (preflightResponse) {
    return preflightResponse;
  }

  const target = getQueryParam(req, 'target');
  const version = getQueryParam(req, 'version');

  if (!target || !version) {
    return res.status(400).send('Missing target or version parameters');
  }

  const cleanCurrentVersion = version.replace(/^v/, '').trim();

  try {
    const { wantPrerelease } = resolveChannel(req);
    const eligibleReleases = await fetchEligibleReleases({ wantPrerelease });

    if (eligibleReleases.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

      return res.status(204).end();
    }

    const candidate = eligibleReleases[0];
    const candidateVersion = candidate.tagName.replace(/^v/, '').trim();

    // Check if update is required
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

    // Find the binary asset and signature
    const provider = getProvider();
    let binaryAsset: UnifiedAsset | null = null;
    let signature = '';

    if (candidate.assets && Array.isArray(candidate.assets)) {
      const matched = findReleaseAssets(candidate.assets, target);

      binaryAsset = matched.binaryAsset;

      if (matched.sigAsset) {
        signature = await provider.getAssetSignature(matched.sigAsset);
      }
    }

    if (!binaryAsset) {
      return res.status(404).send(`Release asset not found for target platform '${target}'`);
    }

    if (!signature) {
      const sigAsset = candidate.assets?.find(
        a => a.name.toLowerCase() === `${binaryAsset.name.toLowerCase()}.sig`,
      );

      if (sigAsset) {
        signature = await provider.getAssetSignature(sigAsset);
      }
    }

    const baseUrl = resolveBaseUrl(req);
    const downloadUrl = buildDownloadUrl(baseUrl, binaryAsset.id);
    const frameworkVersion = resolveFrameworkVersion(req, 'tauri', 2);

    res.setHeader('Vary', 'Origin, X-Update-Channel, X-Framework-Version, Accept, User-Agent');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    if (frameworkVersion === 1) {
      const tauriV1Response: TauriV1UpdateResponse = {
        notes: candidate.body,
        pub_date: candidate.publishedAt ?? '',
        signature,
        url: downloadUrl,
        version: candidateVersion,
      };

      return res.status(200).json(tauriV1Response);
    }

    const tauriUpdateResponse: TauriUpdateResponse = {
      notes: candidate.body,
      platforms: {
        [target]: {
          signature,
          url: downloadUrl,
        },
      },
      pub_date: candidate.publishedAt ?? '',
      version: candidateVersion,
    };

    return res.status(200).json(tauriUpdateResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
