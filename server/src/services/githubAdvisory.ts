import { ProxyAgent } from 'undici';
import type { VulnerabilityResult } from '../types.js';

const GH_API_BASE = 'https://api.github.com/advisories';

let lastCallTime = 0;
const MIN_INTERVAL = 2000;

function getProxyAgent(): ProxyAgent | undefined {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return undefined;
  try {
    return new ProxyAgent({ uri: proxy });
  } catch {
    return undefined;
  }
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL - elapsed));
  }
  lastCallTime = Date.now();
}

export async function searchGitHubAdvisories(techName: string): Promise<VulnerabilityResult[]> {
  try {
    await rateLimit();

    const url = new URL(GH_API_BASE);
    url.searchParams.append('q', techName);
    url.searchParams.append('type', 'reviewed');
    url.searchParams.append('per_page', '10');
    url.searchParams.append('sort', 'published');
    url.searchParams.append('direction', 'desc');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const dispatcher = getProxyAgent();
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'VulnPulse/1.0'
        },
        signal: controller.signal,
        ...(dispatcher ? { dispatcher } : {}),
      } as any);
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`GitHub Advisories API returned ${response.status}`);
        return [];
      }

      const advisories = await response.json();
      if (!Array.isArray(advisories)) return [];

      return advisories.map((advisory: any) => {
        const cvss = advisory.cvss;
        return {
          cveId: advisory.cve_id || null,
          title: advisory.summary?.slice(0, 120) || '',
          description: advisory.description?.slice(0, 2000) || '',
          url: advisory.html_url || '',
          source: 'github' as const,
          sourceId: advisory.ghsa_id,
          publishedAt: advisory.published_at ? new Date(advisory.published_at) : undefined,
          cvssScore: cvss?.score ?? undefined,
          severity: advisory.severity?.toLowerCase() as VulnerabilityResult['severity'],
        };
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('GitHub Advisories request timed out');
    } else {
      console.error('GitHub Advisories search error:', error.message);
    }
    return [];
  }
}
