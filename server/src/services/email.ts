import nodemailer from 'nodemailer';

interface VulnerabilityEmailData {
  id: string;
  cveId?: string;
  title: string;
  description: string;
  url: string;
  source: string;
  cvssScore?: number;
  severity?: string;
  affectedVersions?: string;
  patchedVersion?: string;
  aiSummary?: string;
  aiImpact?: string;
  aiRemediation?: string;
  createdAt: Date;
  techStack?: { name: string };
}

let transporter: any = null;

function getTransporter(): any {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email configuration incomplete, notifications disabled');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporter;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  critical: { bg: '#dc2626', text: '#ffffff', emoji: '🚨' },
  high: { bg: '#ea580c', text: '#ffffff', emoji: '🔥' },
  medium: { bg: '#d97706', text: '#ffffff', emoji: '⚡' },
  low: { bg: '#16a34a', text: '#ffffff', emoji: '📌' },
  none: { bg: '#6b7280', text: '#ffffff', emoji: 'ℹ️' },
};

export async function sendVulnerabilityEmail(data: VulnerabilityEmailData): Promise<boolean> {
  const mailer = getTransporter();

  if (!mailer || !process.env.NOTIFY_EMAIL) {
    return false;
  }

  const severity = data.severity || 'none';
  const sev = SEVERITY_COLORS[severity] || SEVERITY_COLORS.none;
  const cveLabel = data.cveId || 'VULN';

  try {
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `${sev.emoji} [${severity.toUpperCase()}] ${cveLabel}: ${data.title.slice(0, 60)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${sev.bg}; color: ${sev.text}; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #1a1a2e; color: #e2e8f0; padding: 20px; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .badge-severity { background: ${sev.bg}; color: ${sev.text}; }
            .badge-source { background: #334155; color: #94a3b8; margin-left: 8px; }
            .meta { color: #94a3b8; font-size: 14px; margin: 10px 0; }
            .section { margin: 16px 0; padding: 12px; background: #0f0f23; border-radius: 6px; border-left: 3px solid ${sev.bg}; }
            .section-title { font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
            .section-text { color: #94a3b8; font-size: 14px; }
            .button { display: inline-block; background: ${sev.bg}; color: ${sev.text}; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; font-weight: 600; }
            .cvss-bar { width: 100%; height: 6px; background: #334155; border-radius: 3px; margin: 8px 0; }
            .cvss-fill { height: 100%; background: ${sev.bg}; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${sev.emoji} Vulnerability Alert</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">VulnPulse Intelligence Platform</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #e2e8f0;">${data.title}</h2>

              <p>
                <span class="badge badge-severity">${severity.toUpperCase()}</span>
                <span class="badge badge-source">${data.source}</span>
                ${data.cveId ? `<span class="badge badge-source">${data.cveId}</span>` : ''}
              </p>

              ${data.cvssScore ? `
              <div class="meta">
                <strong>CVSS Score:</strong> ${data.cvssScore}/10
                <div class="cvss-bar"><div class="cvss-fill" style="width: ${data.cvssScore * 10}%;"></div></div>
              </div>
              ` : ''}

              ${data.techStack ? `<p class="meta"><strong>Affected Stack:</strong> ${data.techStack.name}</p>` : ''}

              ${data.aiSummary ? `
              <div class="section">
                <div class="section-title">Summary</div>
                <div class="section-text">${data.aiSummary}</div>
              </div>
              ` : ''}

              ${data.affectedVersions ? `<p class="meta"><strong>Affected Versions:</strong> ${data.affectedVersions}</p>` : ''}
              ${data.patchedVersion ? `<p class="meta"><strong>Patched Version:</strong> ${data.patchedVersion}</p>` : ''}

              ${data.aiImpact ? `
              <div class="section">
                <div class="section-title">Impact</div>
                <div class="section-text">${data.aiImpact}</div>
              </div>
              ` : ''}

              ${data.aiRemediation ? `
              <div class="section">
                <div class="section-title">Remediation</div>
                <div class="section-text">${data.aiRemediation}</div>
              </div>
              ` : ''}

              <div class="meta">
                <p><strong>Discovered:</strong> ${new Date(data.createdAt).toLocaleString('zh-CN')}</p>
              </div>

              <a href="${data.url}" class="button">View Details →</a>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log(`Email sent for vulnerability: ${data.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
