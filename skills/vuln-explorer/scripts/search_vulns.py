#!/usr/bin/env python3
"""Search GitHub Security Advisories for vulnerabilities by tech name."""

import argparse
import json
import sys
import os
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import URLError


def search_advisories(tech_name: str, severity: list[str] | None = None, limit: int = 10) -> list[dict]:
    """Search GitHub Advisory API for vulnerabilities matching tech_name."""
    url = f"https://api.github.com/advisories?q={tech_name}&type=reviewed&per_page={limit}&sort=published&direction=desc"

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    req = Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "VulnExplorer/1.0"
    })

    try:
        if proxy:
            import urllib.request
            proxy_handler = urllib.request.ProxyHandler({"https": proxy})
            opener = urllib.request.build_opener(proxy_handler)
            resp = opener.open(req, timeout=15)
        else:
            resp = urlopen(req, timeout=15)
        data = json.loads(resp.read())
    except URLError as e:
        print(f"Error: Failed to reach GitHub API: {e}", file=sys.stderr)
        if not proxy:
            print("Hint: Set HTTPS_PROXY env var if you need a proxy", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []

    results = []
    for adv in (data if isinstance(data, list) else []):
        cvss = adv.get("cvss", {}) or {}
        vuln_severity = (adv.get("severity") or "unknown").lower()

        # Filter by severity
        if severity and vuln_severity not in severity:
            continue

        vuln = adv.get("vulnerabilities", [{}])[0]

        results.append({
            "ghsa_id": adv.get("ghsa_id", ""),
            "cve_id": adv.get("cve_id"),
            "title": adv.get("summary", "")[:120],
            "severity": vuln_severity.upper(),
            "cvss_score": cvss.get("score"),
            "cvss_vector": cvss.get("vector_string"),
            "description": (adv.get("description", "") or "")[:800],
            "url": adv.get("html_url", ""),
            "published_at": adv.get("published_at", ""),
            "affected_package": vuln.get("package", {}).get("name", ""),
            "vulnerable_range": vuln.get("vulnerable_version_range", ""),
            "patched_version": vuln.get("first_patched_version", ""),
            "ecosystem": vuln.get("package", {}).get("ecosystem", ""),
        })

    return results


def print_table(results: list[dict]) -> None:
    """Print results as a formatted table."""
    if not results:
        print("\nNo vulnerabilities found.\n")
        return

    print(f"\nFound {len(results)} vulnerabilities:\n")
    print(f"{'SEVERITY':<10} {'CVSS':<6} {'CVE ID':<18} {'AFFECTED PACKAGE':<30} {'TITLE'}")
    print("-" * 130)

    for r in results:
        sev = r["severity"]
        cvss = str(r["cvss_score"]) if r["cvss_score"] else "N/A"
        cve = r["cve_id"] or r["ghsa_id"]
        pkg = r["affected_package"][:28] if r["affected_package"] else "N/A"
        title = r["title"][:55]

        print(f"{sev:<10} {cvss:<6} {cve:<18} {pkg:<30} {title}")


def print_detail(results: list[dict]) -> None:
    """Print detailed results."""
    for i, r in enumerate(results, 1):
        print(f"\n{'=' * 70}")
        print(f"[{i}] {r['severity']} | CVSS: {r['cvss_score'] or 'N/A'} | {r['cve_id'] or r['ghsa_id']}")
        print(f"{'=' * 70}")
        print(f"Title:     {r['title']}")
        print(f"Package:   {r['affected_package']} ({r['ecosystem']})")
        print(f"Affected:  {r['vulnerable_range'] or 'N/A'}")
        print(f"Fixed in:  {r['patched_version'] or 'N/A'}")
        print(f"URL:       {r['url']}")
        print(f"Published: {r['published_at']}")
        print(f"\n{r['description'][:300]}")
        print()


def main():
    parser = argparse.ArgumentParser(description="Search GitHub Security Advisories for vulnerabilities")
    parser.add_argument("tech_name", help="Tech stack name to search (e.g. react, postgresql)")
    parser.add_argument("--severity", help="Filter by severity (comma-separated: critical,high,medium,low)")
    parser.add_argument("--limit", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--detail", action="store_true", help="Show detailed output")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()
    severity_filter = [s.strip().lower() for s in args.severity.split(",")] if args.severity else None

    print(f"\nSearching vulnerabilities for: {args.tech_name}\n", file=sys.stderr)

    results = search_advisories(args.tech_name, severity_filter, args.limit)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    elif args.detail:
        print_detail(results)
    else:
        print_table(results)


if __name__ == "__main__":
    main()
