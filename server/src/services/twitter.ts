import type { VulnerabilityResult } from '../types.js';

const TWITTER_API_BASE = 'https://api.twitterapi.io';

async function makeTwitterRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    return { tweets: [] };
  }

  const url = new URL(`${TWITTER_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status}`);
  }

  return response.json();
}

export async function searchTwitterSecurity(techName: string): Promise<VulnerabilityResult[]> {
  if (!process.env.TWITTER_API_KEY) {
    return [];
  }

  try {
    const query = `${techName} (CVE OR vulnerability OR exploit)`;
    const params: Record<string, string> = {
      query,
      queryType: 'Top',
    };

    const data = await makeTwitterRequest('/twitter/tweet/advanced_search', params);
    const tweets = data.tweets || [];

    return tweets.slice(0, 10).map((tweet: any) => ({
      cveId: null,
      title: (tweet.text || '').slice(0, 120),
      description: tweet.text || '',
      url: tweet.url || '',
      source: 'twitter' as const,
      sourceId: tweet.id,
      publishedAt: tweet.createdAt ? new Date(tweet.createdAt) : undefined,
      author: tweet.author ? {
        name: tweet.author.name,
        username: tweet.author.userName,
        avatar: tweet.author.profilePicture,
        followers: tweet.author.followers,
        verified: tweet.author.isBlueVerified,
      } : undefined,
      likeCount: tweet.likeCount,
      retweetCount: tweet.retweetCount,
      viewCount: tweet.viewCount,
    }));
  } catch (error) {
    console.error('Twitter security search error:', error);
    return [];
  }
}
