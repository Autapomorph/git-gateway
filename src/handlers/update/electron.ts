import { getProvider } from '../../lib/providers/index.js';
import {
  buildDownloadUrl,
  fetchEligibleReleases,
  getQueryParam,
  handlePreflight,
  resolveBaseUrl,
} from '../../lib/updaters/common.js';
import {
  type ElectronManifest,
  findElectronBinary,
  parseElectronTarget,
  serializeElectronYaml,
} from '../../lib/updaters/electron.js';
import type { GatewayRequest, GatewayResponse } from '../../types/http.js';

export async function updateElectronHandler(req: GatewayRequest, res: GatewayResponse) {
  const preflightResponse = handlePreflight(req, res);

  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const fileName = getQueryParam(req, 'file') ?? 'latest.yml';
    const { channel, isArm64, platform } = parseElectronTarget(fileName);
    const wantPrerelease = channel !== 'stable';

    const eligibleReleases = await fetchEligibleReleases({ wantPrerelease });

    if (eligibleReleases.length === 0) {
      return res.status(404).send('No eligible releases found');
    }

    const candidate = eligibleReleases[0];
    const candidateVersion = candidate.tagName.replace(/^v/, '').trim();
    const assets = candidate.assets ?? [];

    const baseUrl = resolveBaseUrl(req);
    const provider = getProvider();

    // 1. Try finding existing pre-generated .yml file in release assets
    const ymlAsset = assets.find(a => a.name.toLowerCase() === fileName.toLowerCase());

    if (ymlAsset) {
      const rawYml = await provider.getAssetSignature(ymlAsset);

      if (rawYml) {
        // Rewrite asset URLs/paths to secure gateway download endpoint
        const rewrittenYml = rawYml.replace(
          /^\s*(url|path):\s*(.+)$/gm,
          (match, key: string, targetPath: string) => {
            const clean = targetPath.trim().replace(/^['"]|['"]$/g, '');
            const matchingAsset = assets.find(a => a.name.toLowerCase() === clean.toLowerCase());

            if (matchingAsset) {
              return `${key}: ${buildDownloadUrl(baseUrl, matchingAsset.id)}`;
            }

            return match;
          },
        );

        res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
        res.setHeader('Vary', 'Origin, X-Update-Channel');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

        return res.status(200).send(rewrittenYml);
      }
    }

    // 2. Synthesize manifest dynamically if .yml asset wasn't pre-generated
    const binary = findElectronBinary(assets, platform, isArm64);

    if (!binary) {
      return res.status(404).send(`No matching Electron release asset found for ${fileName}`);
    }

    const downloadUrl = buildDownloadUrl(baseUrl, binary.id);

    // Look for sidecar sha512
    let sha512 = '';
    const sha512Asset = assets.find(
      a => a.name.toLowerCase() === `${binary.name.toLowerCase()}.sha512`,
    );

    if (sha512Asset) {
      const rawSha = await provider.getAssetSignature(sha512Asset);

      if (rawSha) {
        [sha512 = ''] = rawSha.trim().split(/\s+/);
      }
    }

    const manifest: ElectronManifest = {
      files: [
        {
          sha512: sha512 || undefined,
          size: binary.size,
          url: downloadUrl,
        },
      ],
      path: downloadUrl,
      releaseDate: candidate.publishedAt ?? undefined,
      releaseNotes: candidate.body || undefined,
      sha512: sha512 || undefined,
      version: candidateVersion,
    };

    const yamlOutput = serializeElectronYaml(manifest);

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Vary', 'Origin, X-Update-Channel');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).send(yamlOutput);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
