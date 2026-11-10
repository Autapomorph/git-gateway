import type { UnifiedAsset } from '../providers/types.js';

export interface ElectronManifestFile {
  sha512?: string;
  size?: number;
  url: string;
}

export interface ElectronManifest {
  files: ElectronManifestFile[];
  path: string;
  releaseDate?: string;
  releaseNotes?: string;
  sha512?: string;
  version: string;
}

export function parseElectronTarget(fileName: string): {
  channel: string;
  isArm64: boolean;
  platform: 'linux' | 'mac' | 'windows';
} {
  const lower = fileName.toLowerCase();

  let channel = 'stable';

  if (lower.startsWith('beta') || lower.includes('.beta.')) {
    channel = 'beta';
  } else if (lower.startsWith('alpha') || lower.includes('.alpha.')) {
    channel = 'alpha';
  }

  let platform: 'linux' | 'mac' | 'windows' = 'windows';

  if (lower.includes('mac') || lower.includes('darwin')) {
    platform = 'mac';
  } else if (lower.includes('linux')) {
    platform = 'linux';
  }

  const isArm64 = lower.includes('arm64');

  return { channel, isArm64, platform };
}

export function findElectronBinary(
  assets: UnifiedAsset[],
  platform: 'linux' | 'mac' | 'windows',
  isArm64: boolean,
): UnifiedAsset | null {
  return (
    assets.find(a => {
      const name = a.name.toLowerCase();

      if (name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.blockmap')) {
        return false;
      }

      if (isArm64 && !name.includes('arm64')) {
        return false;
      }

      if (platform === 'windows') {
        return name.endsWith('.exe') && !name.includes('-installer.');
      }

      if (platform === 'mac') {
        return name.endsWith('.dmg') || name.endsWith('.zip') || name.endsWith('.pkg');
      }

      if (platform === 'linux') {
        return name.endsWith('.appimage') || name.endsWith('.deb') || name.endsWith('.rpm');
      }

      return false;
    }) ?? null
  );
}

export function serializeElectronYaml(manifest: ElectronManifest): string {
  const lines: string[] = [];

  lines.push(`version: ${manifest.version}`);
  lines.push('files:');

  for (const file of manifest.files) {
    lines.push(`  - url: ${file.url}`);

    if (file.sha512) {
      lines.push(`    sha512: ${file.sha512}`);
    }

    if (file.size !== undefined) {
      lines.push(`    size: ${file.size}`);
    }
  }

  lines.push(`path: ${manifest.path}`);

  if (manifest.sha512) {
    lines.push(`sha512: ${manifest.sha512}`);
  }

  if (manifest.releaseDate) {
    lines.push(`releaseDate: '${manifest.releaseDate}'`);
  }

  if (manifest.releaseNotes) {
    lines.push('releaseNotes: |');

    for (const noteLine of manifest.releaseNotes.split('\n')) {
      lines.push(`  ${noteLine}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
