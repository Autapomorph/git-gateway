import { getProvider } from '../../lib/providers/index.js';
import {
  buildDownloadUrl,
  fetchEligibleReleases,
  handlePreflight,
  resolveBaseUrl,
  resolveChannel,
} from '../../lib/updaters/common.js';
import { type SparkleItem, serializeSparkleFeed } from '../../lib/updaters/sparkle.js';
import type { GatewayRequest, GatewayResponse } from '../../types/http.js';

export async function updateSparkleHandler(req: GatewayRequest, res: GatewayResponse) {
  const preflightResponse = handlePreflight(req, res);

  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const { wantPrerelease } = resolveChannel(req);
    const eligibleReleases = await fetchEligibleReleases({ wantPrerelease });

    if (eligibleReleases.length === 0) {
      return res.status(404).send('No eligible releases found');
    }

    const baseUrl = resolveBaseUrl(req);
    const provider = getProvider();

    // Sparkle feeds typically list the recent releases (up to 10)
    const recentReleases = eligibleReleases.slice(0, 10);
    const itemPromises = recentReleases.map(async release => {
      const version = release.tagName.replace(/^v/, '').trim();
      const assets = release.assets ?? [];

      // Find suitable sparkle asset (prefer .dmg, .pkg, .zip, or .exe)
      const binary =
        assets.find(a => {
          const lower = a.name.toLowerCase();

          return (
            (lower.endsWith('.dmg') ||
              lower.endsWith('.pkg') ||
              lower.endsWith('.zip') ||
              lower.endsWith('.exe')) &&
            !lower.endsWith('.sig') &&
            !lower.endsWith('.sha256')
          );
        }) ?? assets[0];

      if (!binary) {
        return null;
      }

      let edSignature: string | undefined;
      const sigAsset = assets.find(
        a => a.name.toLowerCase() === `${binary.name.toLowerCase()}.sig`,
      );

      if (sigAsset) {
        const rawSig = await provider.getAssetSignature(sigAsset);

        if (rawSig) {
          edSignature = rawSig.trim();
        }
      }

      const item: SparkleItem = {
        edSignature,
        length: binary.size,
        pubDate: release.publishedAt ? new Date(release.publishedAt).toUTCString() : undefined,
        releaseNotesLink: `${baseUrl}/api/v1/release-notes/${encodeURIComponent(version)}`,
        title: `Version ${version}`,
        type: binary.contentType ?? 'application/octet-stream',
        url: buildDownloadUrl(baseUrl, binary.id),
        version,
      };

      return item;
    });

    const resolvedItems = await Promise.all(itemPromises);
    const items = resolvedItems.filter((item): item is SparkleItem => item !== null);

    const xmlOutput = serializeSparkleFeed('Application Updates', baseUrl, items);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Vary', 'Origin, X-Update-Channel');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).send(xmlOutput);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
