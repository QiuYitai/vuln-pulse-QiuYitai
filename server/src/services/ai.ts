import type { VulnerabilityAnalysis } from '../types.js';

// ========== Vulnerability Analysis ==========

export interface VulnerabilityAnalysisInput {
  title: string;
  description: string;
  techStack: {
    name: string;
    version: string | null;
  };
}

function getPrompt(input: VulnerabilityAnalysisInput): string {
  return `You are a vulnerability intelligence analyst. Given a security vulnerability report and a user's registered tech stack, perform a detailed assessment.

User's Tech Stack:
- Name: ${input.techStack.name}
- Version: ${input.techStack.version || 'unknown'}

Vulnerability Report:
Title: ${input.title}
Description: ${input.description}

Analyze and output JSON only:
{
  "isReal": true/false,
  "relevance": 0-100,
  "cvssScore": 0.0-10.0,
  "severity": "none|low|medium|high|critical",
  "exploitability": "none|poc|functional|high",
  "affectedVersions": "...",
  "patchedVersion": "...",
  "isAffected": true/false,
  "matchConfidence": 0-100,
  "aiSummary": "...",
  "aiImpact": "...",
  "aiRemediation": "..."
}

Rules:
- isReal: Is this a genuine vulnerability?
- relevance: How relevant to ${input.techStack.name}? (0-100)
- cvssScore: CVSS 3.1 base score. Use report score if available, otherwise estimate.
- severity: 0.0=none, 0.1-3.9=low, 4.0-6.9=medium, 7.0-8.9=high, 9.0-10.0=critical
- exploitability: "none" / "poc" / "functional" / "high"
- affectedVersions: e.g. "<= 2.3.4", empty if unclear
- patchedVersion: e.g. ">= 2.4.0", empty if unclear
- isAffected: true ONLY if user version (${input.techStack.version || 'unknown'}) is in affected range. If version unknown, default true when relevance >= 70.
- matchConfidence: 0-100
- aiSummary: 1-2 sentences in Chinese
- aiImpact: What could happen if exploited? Chinese, 1-2 sentences
- aiRemediation: Recommended fix. Chinese, 1 sentence

ONLY output JSON. No preamble.`;
}

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY not configured');

  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent.slice(0, 4000) }
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AI API returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const msg = data.choices?.[0]?.message || {};
  // Some reasoning models (DeepSeek R1/V4) put output in reasoning_content
  return msg.content || msg.reasoning_content || '';
}

export async function analyzeVulnerability(
  input: VulnerabilityAnalysisInput
): Promise<VulnerabilityAnalysis> {
  if (!process.env.AI_API_KEY) {
    return {
      isReal: true, relevance: 50, cvssScore: 0, severity: 'none',
      exploitability: 'none', affectedVersions: '', patchedVersion: '',
      isAffected: true, matchConfidence: 0,
      aiSummary: 'AI analysis not configured (missing AI_API_KEY)',
      aiImpact: '', aiRemediation: '',
    };
  }

  try {
    const prompt = getPrompt(input);
    const content = await callAI(prompt, input.description);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isReal: Boolean(parsed.isReal),
        relevance: Math.min(100, Math.max(0, Number(parsed.relevance) || 0)),
        cvssScore: Math.min(10, Math.max(0, Number(parsed.cvssScore) || 0)),
        severity: ['none', 'low', 'medium', 'high', 'critical'].includes(parsed.severity)
          ? parsed.severity : 'none',
        exploitability: ['none', 'poc', 'functional', 'high'].includes(parsed.exploitability)
          ? parsed.exploitability : 'none',
        affectedVersions: String(parsed.affectedVersions || '').slice(0, 100),
        patchedVersion: String(parsed.patchedVersion || '').slice(0, 100),
        isAffected: Boolean(parsed.isAffected),
        matchConfidence: Math.min(100, Math.max(0, Number(parsed.matchConfidence) || 0)),
        aiSummary: String(parsed.aiSummary || '').slice(0, 200),
        aiImpact: String(parsed.aiImpact || '').slice(0, 300),
        aiRemediation: String(parsed.aiRemediation || '').slice(0, 300),
      };
    }

    throw new Error('No JSON found in AI response');
  } catch (error: any) {
    console.error('Vulnerability analysis failed:', error.message);
    return {
      isReal: true, relevance: 30, cvssScore: 0, severity: 'none',
      exploitability: 'none', affectedVersions: '', patchedVersion: '',
      isAffected: true, matchConfidence: 10,
      aiSummary: 'AI analysis failed, using defaults',
      aiImpact: '', aiRemediation: '',
    };
  }
}

export async function batchAnalyzeVulnerabilities(
  items: VulnerabilityAnalysisInput[],
  concurrency: number = 3
): Promise<VulnerabilityAnalysis[]> {
  const results: VulnerabilityAnalysis[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(item => analyzeVulnerability(item)));
    results.push(...batchResults);
  }
  return results;
}
