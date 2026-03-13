---
name: vuln-explorer
description: Search and analyze security vulnerabilities from GitHub Security Advisories. Query CVEs by tech stack name, filter by severity, and generate vulnerability intelligence reports.
---

# Vuln Explorer — AI 漏洞情报技能

## 概述

Vuln Explorer 是一个漏洞情报搜索技能，可从 GitHub Security Advisories 实时查询 CVE 漏洞数据。无需后端服务，开箱即用。

支持场景：
- 查询某个技术栈的最新漏洞："帮我查一下 React 最近有什么漏洞"
- 按严重度筛选："只看 PostgreSQL 的 Critical 和 High 漏洞"
- 生成漏洞报告："生成一份 Express.js 的漏洞情报报告"
- 批量检查依赖："检查我项目里这些依赖有没有漏洞"

## 使用方式

### 1. 搜索漏洞

```bash
python scripts/search_vulns.py <tech_name> [--severity critical,high] [--limit 10]
```

示例：
```bash
python scripts/search_vulns.py react --severity critical,high --limit 5
python scripts/search_vulns.py postgresql --limit 10
```

### 2. 生成漏洞报告

```bash
python scripts/generate_report.py <tech_name> [--output report.md]
```

示例：
```bash
python scripts/generate_report.py express --output express-vulns.md
```

## 数据源

- GitHub Security Advisories API（免费，无需 Key）
- 返回已审核的漏洞公告（CVE + GHSA）
- 包含 CVSS 评分、受影响版本、修复版本等

## 分析指南

### 严重度判断标准

| 等级 | CVSS 范围 | 含义 |
|------|----------|------|
| critical | 9.0-10.0 | 可远程利用、无需交互、影响严重 |
| high | 7.0-8.9 | 较易利用、可能造成数据泄露或服务中断 |
| medium | 4.0-6.9 | 利用条件受限、影响有限 |
| low | 0.1-3.9 | 利用难度高、影响轻微 |

### 需要重点关注的情况

- `exploitability` 为 `functional` 或 `high`：已有可用利用代码
- `cvssScore >= 9.0`：Critical 级别，需立即修复
- `affectedVersions` 包含用户当前使用版本
- `patchedVersion` 说明已有修复版本，应尽快升级

### 生成报告的要点

1. 按严重度排序（Critical > High > Medium > Low）
2. 标注是否有可用补丁
3. 突出显示影响用户特定版本的漏洞
4. 给出修复优先级建议

## 环境要求

```bash
pip install -r scripts/requirements.txt
```

## 参考文档

- [GitHub Advisory API 参考](references/api-reference.md) — API 端点、参数、响应字段说明
