/**
 * Test each vulnerability data source
 * Run: npx tsx src/test-sources.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { searchNVD } from './services/nvd.js';
import { searchGitHubAdvisories } from './services/githubAdvisory.js';
import { searchCIRCL } from './services/cveOrg.js';
import { searchSecurityBlogs } from './services/securityBlogs.js';
import { searchAllVulnerabilitySources } from './services/vulnerabilitySearch.js';

const TEST_QUERY = 'react';

async function testSource(name: string, fn: () => Promise<any[]>) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(50)}`);
  try {
    const start = Date.now();
    const results = await fn();
    const elapsed = Date.now() - start;
    console.log(`${results.length > 0 ? 'PASS' : 'WARN'} ${name}: ${results.length} results (${elapsed}ms)`);
    if (results.length > 0) {
      results.slice(0, 3).forEach((r, i) => {
        console.log(`  [${i + 1}] ${r.title?.slice(0, 80)}`);
        console.log(`      CVE: ${r.cveId || 'N/A'}, Source: ${r.source}, CVSS: ${r.cvssScore ?? 'N/A'}`);
      });
    }
    return { name, success: true, count: results.length, elapsed };
  } catch (error) {
    console.log(`FAIL ${name}: ERROR - ${error instanceof Error ? error.message : error}`);
    return { name, success: false, count: 0, elapsed: 0 };
  }
}

async function main() {
  console.log(`\nTesting all vulnerability sources with query: "${TEST_QUERY}"\n`);

  const results = [];

  results.push(await testSource('NVD', () => searchNVD(TEST_QUERY)));
  results.push(await testSource('GitHub Advisory', () => searchGitHubAdvisories(TEST_QUERY)));
  results.push(await testSource('CIRCL', () => searchCIRCL(TEST_QUERY)));
  results.push(await testSource('Security Blogs', () => searchSecurityBlogs(TEST_QUERY)));

  console.log(`\n${'='.repeat(50)}`);
  console.log('Aggregated Search');
  console.log(`${'='.repeat(50)}`);
  const allStart = Date.now();
  const all = await searchAllVulnerabilitySources(TEST_QUERY);
  console.log(`Total: ${all.length} unique results (${Date.now() - allStart}ms)`);

  console.log(`\n${'='.repeat(50)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(50)}`);
  for (const r of results) {
    const status = r.success ? (r.count > 0 ? 'PASS' : 'WARN') : 'FAIL';
    console.log(`${status} ${r.name.padEnd(18)} ${String(r.count).padStart(3)} results  (${r.elapsed}ms)`);
  }
}

main().catch(console.error);
