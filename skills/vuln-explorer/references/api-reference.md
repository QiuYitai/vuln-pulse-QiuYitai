# GitHub Security Advisories API Reference

## Endpoint

```
GET https://api.github.com/advisories
```

## Authentication

No authentication required for public advisories. Rate limit: 60 requests/hour (unauthenticated).

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query (tech name, CVE ID, keyword) | `react` |
| `type` | string | Advisory type: `reviewed`, `malware`, `unreviewed` | `reviewed` |
| `severity` | string | Filter: `critical`, `high`, `medium`, `low` | `critical` |
| `per_page` | int | Results per page (max 100) | `10` |
| `sort` | string | `published`, `updated` | `published` |
| `direction` | string | `asc` or `desc` | `desc` |

## Response Fields

```json
[
  {
    "ghsa_id": "GHSA-xxxx-xxxx-xxxx",
    "cve_id": "CVE-2026-12345",
    "summary": "Vulnerability title",
    "description": "Full description...",
    "severity": "critical",
    "html_url": "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx",
    "published_at": "2026-03-15T10:00:00Z",
    "cvss": {
      "score": 9.8,
      "vector_string": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    },
    "vulnerabilities": [
      {
        "package": {
          "ecosystem": "npm",
          "name": "package-name"
        },
        "vulnerable_version_range": "<= 2.3.4",
        "first_patched_version": "2.4.0"
      }
    ],
    "cwes": [
      {
        "cwe_id": "CWE-79",
        "name": "Cross-site Scripting"
      }
    ]
  }
]
```

## Key Fields for Analysis

| Field | Usage |
|-------|-------|
| `cvss.score` | Base severity score (0-10) |
| `severity` | Human-readable severity level |
| `vulnerabilities[].vulnerable_version_range` | Which versions are affected |
| `vulnerabilities[].first_patched_version` | Version with the fix |
| `cwes` | CWE weakness classification |
| `published_at` | When the advisory was published |

## Network Notes

- If behind a firewall or in China, set `HTTPS_PROXY` environment variable
- Request timeout: 15 seconds recommended
- Retry on 429 (rate limit) with exponential backoff
