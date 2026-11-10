import type { UnifiedAsset } from '../providers/types.js';

export interface WailsPlatformInfo {
  sha256?: string;
  signature?: string;
  size?: number;
  url: string;
}

export interface WailsManifest {
  notes?: string;
  platforms: Record<string, WailsPlatformInfo>;
  pub_date?: string;
  version: string;
}

export interface WailsMatchedPlatform {
  binaryAsset: UnifiedAsset;
  platformKey: string;
  shaAsset?: UnifiedAsset;
  sigAsset?: UnifiedAsset;
}

/**
 * Checks if filename looks like an installer rather than a standalone app binary
 * according to official Wails documentation:
 * https://wails.io/guides/updater-github-release-assets/
 */
export function isWailsInstaller(filename: string): boolean {
  const lower = filename.toLowerCase();

  return (
    lower.includes('-installer.') || lower.includes('_installer.') || lower === 'installer.exe'
  );
}

const OS_ALIASES: Record<string, string> = {
  darwin: 'darwin',
  linux: 'linux',
  mac: 'darwin',
  macos: 'darwin',
  osx: 'darwin',
  win: 'windows',
  windows: 'windows',
};

const ARCH_ALIASES: Record<string, string> = {
  '386': '386',
  aarch64: 'arm64',
  amd64: 'amd64',
  arm: 'arm',
  arm64: 'arm64',
  armv7: 'arm',
  i386: '386',
  ia32: '386',
  x64: 'amd64',
  x86: '386',
  x86_64: 'amd64',
};

export function normalizeGoos(os: string): string {
  const lower = os.toLowerCase().trim();

  return OS_ALIASES[lower] ?? lower;
}

export function normalizeGoarch(arch: string): string {
  const lower = arch.toLowerCase().trim();

  return ARCH_ALIASES[lower] ?? lower;
}

export function findWailsPlatforms(
  assets: UnifiedAsset[],
  targetGoos?: string,
  targetGoarch?: string,
): WailsMatchedPlatform[] {
  const matched: WailsMatchedPlatform[] = [];
  const validBinaries = assets.filter(asset => {
    const name = asset.name.toLowerCase();
    const isMetadata =
      name.endsWith('.sig') ||
      name.endsWith('.sha256') ||
      name.endsWith('.sha512') ||
      name.endsWith('.md5') ||
      name.endsWith('.json') ||
      name.endsWith('.yml') ||
      name.endsWith('.yaml');

    return !isMetadata && !isWailsInstaller(name);
  });

  // Common target pairs
  const targetsToCheck: { goarch: string; goos: string }[] = [];

  if (targetGoos && targetGoarch) {
    targetsToCheck.push({
      goos: normalizeGoos(targetGoos),
      goarch: normalizeGoarch(targetGoarch),
    });
  } else {
    // Collect all discoverable platforms
    const osList = ['windows', 'darwin', 'linux'];
    const archList = ['amd64', 'arm64', '386', 'arm'];

    for (const goos of osList) {
      for (const goarch of archList) {
        targetsToCheck.push({ goos, goarch });
      }
    }
  }

  for (const target of targetsToCheck) {
    const candidate = validBinaries.find(asset => {
      const lower = asset.name.toLowerCase();

      // Check OS match
      const osMatch =
        (target.goos === 'windows' &&
          (lower.includes('windows') || lower.includes('win') || lower.endsWith('.exe'))) ||
        (target.goos === 'darwin' &&
          (lower.includes('darwin') || lower.includes('mac') || lower.includes('osx'))) ||
        (target.goos === 'linux' && lower.includes('linux'));

      if (!osMatch) {
        return false;
      }

      // Check Arch match
      const archMatch =
        (target.goarch === 'amd64' &&
          (lower.includes('amd64') || lower.includes('x86_64') || lower.includes('x64'))) ||
        (target.goarch === 'arm64' && (lower.includes('arm64') || lower.includes('aarch64'))) ||
        (target.goarch === '386' &&
          (lower.includes('386') ||
            lower.includes('i386') ||
            lower.includes('x86') ||
            lower.includes('ia32'))) ||
        (target.goarch === 'arm' && (lower.includes('armv7') || lower.includes('arm')));

      return archMatch;
    });

    if (candidate) {
      const platformKey = `${target.goos}-${target.goarch}`;

      // Check if not already added
      if (!matched.some(m => m.platformKey === platformKey)) {
        const sigAsset = assets.find(
          a => a.name.toLowerCase() === `${candidate.name.toLowerCase()}.sig`,
        );
        const shaAsset = assets.find(
          a => a.name.toLowerCase() === `${candidate.name.toLowerCase()}.sha256`,
        );

        matched.push({
          binaryAsset: candidate,
          platformKey,
          shaAsset,
          sigAsset,
        });
      }
    }
  }

  return matched;
}
