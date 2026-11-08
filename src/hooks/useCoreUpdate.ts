import { useQuery } from '@tanstack/react-query';

import type { UpgradeChannel } from '~/api/configs';
import { fetchAlphaCommit, fetchLatestReleaseTag, MIHOMO_RELEASES_URL } from '~/api/mihomo-release';
import { ClashAPIConfig } from '~/types';

import { useVersion } from './useVersion';

type CoreVersion = { channel: 'alpha'; hash: string } | { channel: 'release'; tag: string };

/** CoreUpdate.channel is the upgrade channel that installs this version. */
export type CoreUpdate = { channel: UpgradeChannel; version: string; url: string };

// mihomo reports `alpha-<short sha>` for alpha builds and `v1.2.3` for releases. Anything else
// (forks, custom builds) is left unchecked rather than guessed at.
function parseCoreVersion(version: string | undefined): CoreVersion | null {
  if (!version) return null;
  const alpha = /^alpha-([0-9a-f]{7,40})$/.exec(version);
  if (alpha) return { channel: 'alpha', hash: alpha[1] };
  if (/^v\d+\.\d+\.\d+$/.test(version)) return { channel: 'release', tag: version };
  return null;
}

/**
 * useCoreUpdate returns the newer mihomo build on the running core's channel, or null when the core
 * is up to date, is not mihomo, has an unrecognised version string, or GitHub could not be reached.
 */
export function useCoreUpdate(apiConfig: ClashAPIConfig): CoreUpdate | null {
  const version = useVersion(apiConfig);
  const current = version.core === 'mihomo' ? parseCoreVersion(version.version) : null;
  const channel = current?.channel;

  const { data: latest } = useQuery({
    queryKey: ['mihomo-latest', channel],
    queryFn: ({ signal }) =>
      channel === 'alpha' ? fetchAlphaCommit(signal) : fetchLatestReleaseTag(signal),
    enabled: channel !== undefined,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  if (!current || !latest) return null;
  if (current.channel === 'alpha') {
    // The core's short hash and version.txt's differ in length (8 vs 7 chars), so compare by prefix.
    if (latest.startsWith(current.hash)) return null;
    return {
      channel: 'alpha',
      version: `alpha-${latest.slice(0, 7)}`,
      url: `${MIHOMO_RELEASES_URL}/tag/Prerelease-Alpha`,
    };
  }
  if (latest === current.tag) return null;
  return { channel: 'release', version: latest, url: `${MIHOMO_RELEASES_URL}/tag/${latest}` };
}
