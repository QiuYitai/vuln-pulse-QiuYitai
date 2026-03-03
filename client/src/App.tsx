import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Plus, Bell, Trash2,
  ExternalLink, RefreshCw, AlertTriangle,
  Zap, Globe, Clock, Bug, Layers, ShieldAlert,
  ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import {
  techStacksApi, vulnerabilitiesApi, notificationsApi, triggerVulnerabilityCheck,
  type TechStack, type Vulnerability, type VulnerabilityStats, type Notification
} from './services/api';
import { onNewVulnerability, onNotification, subscribeToTechStacks } from './services/socket';
import { cn } from './lib/utils';
import { Spotlight } from './components/ui/spotlight';
import { BackgroundBeams } from './components/ui/background-beams';
import { Meteors } from './components/ui/meteors';
import FilterSortBar, { defaultFilterState, type FilterState } from './components/FilterSortBar';
import { relativeTime } from './utils/relativeTime';

// Severity config
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  critical: { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', emoji: '🚨' },
  high: { label: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/20', emoji: '🔥' },
  medium: { label: 'MEDIUM', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', emoji: '⚡' },
  low: { label: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', emoji: '📌' },
  none: { label: 'NONE', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/20', emoji: 'ℹ️' },
};

function getSeverityConfig(severity: string | null) {
  return SEVERITY_CONFIG[severity || 'none'] || SEVERITY_CONFIG.none;
}

// Source config
function getSourceLabel(source: string) {
  const labels: Record<string, string> = {
    nvd: 'NVD', github: 'GitHub Advisory', cve_circl: 'CVE.org',
    security_blog: 'Security Blog', twitter: 'Twitter'
  };
  return labels[source] || source;
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'nvd': return <Shield className="w-3.5 h-3.5" />;
    case 'github': return <Zap className="w-3.5 h-3.5" />;
    case 'cve_circl': return <Globe className="w-3.5 h-3.5" />;
    case 'security_blog': return <Search className="w-3.5 h-3.5" />;
    case 'twitter': return <Zap className="w-3.5 h-3.5" />;
    default: return <Globe className="w-3.5 h-3.5" />;
  }
}

const CATEGORY_OPTIONS = ['Frontend', 'Backend', 'Database', 'Runtime', 'Library', 'OS', 'Other'];

function App() {
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [stats, setStats] = useState<VulnerabilityStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [newStackName, setNewStackName] = useState('');
  const [newStackVersion, setNewStackVersion] = useState('');
  const [newStackCategory, setNewStackCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tech-stacks'>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<FilterState>({ ...defaultFilterState });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedImpacts, setExpandedImpacts] = useState<Set<string>>(new Set());
  const [expandedRemediations, setExpandedRemediations] = useState<Set<string>>(new Set());

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams: Record<string, string | number> = {
        limit: 20,
        page: currentPage,
      };
      if (dashboardFilters.source) filterParams.source = dashboardFilters.source;
      if (dashboardFilters.severity) filterParams.severity = dashboardFilters.severity;
      if (dashboardFilters.techStackId) filterParams.techStackId = dashboardFilters.techStackId;
      if (dashboardFilters.timeRange) filterParams.timeRange = dashboardFilters.timeRange;
      if (dashboardFilters.sortBy) filterParams.sortBy = dashboardFilters.sortBy;
      if (dashboardFilters.sortOrder) filterParams.sortOrder = dashboardFilters.sortOrder;

      const [stacksData, vulnsData, statsData, notifData] = await Promise.all([
        techStacksApi.getAll(),
        vulnerabilitiesApi.getAll(filterParams as any),
        vulnerabilitiesApi.getStats(),
        notificationsApi.getAll({ limit: 20 })
      ]);
      setTechStacks(stacksData);
      setVulnerabilities(vulnsData.data);
      setTotalPages(vulnsData.pagination.totalPages);
      setStats(statsData);
      setNotifications(notifData.data);
      setUnreadCount(notifData.unreadCount);

      const activeStacks = stacksData.filter(s => s.isActive).map(s => s.name);
      if (activeStacks.length > 0) {
        subscribeToTechStacks(activeStacks);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardFilters, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [dashboardFilters]);
  useEffect(() => { loadData(); }, [loadData]);

  // WebSocket events
  useEffect(() => {
    const unsubVuln = onNewVulnerability((vuln) => {
      setVulnerabilities(prev => [vuln as any, ...prev.slice(0, 19)]);
      showToast(`New vulnerability: ${vuln.title.slice(0, 40)}`, 'success');
      loadData();
    });
    const unsubNotif = onNotification(() => {
      setUnreadCount(prev => prev + 1);
    });
    return () => { unsubVuln(); unsubNotif(); };
  }, [loadData]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Add tech stack
  const handleAddTechStack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStackName.trim()) return;
    try {
      const stack = await techStacksApi.create({
        name: newStackName.trim(),
        version: newStackVersion.trim() || undefined,
        category: newStackCategory || undefined,
      });
      setTechStacks(prev => [stack, ...prev]);
      setNewStackName('');
      setNewStackVersion('');
      setNewStackCategory('');
      showToast('Tech stack added', 'success');
      subscribeToTechStacks([stack.name]);
    } catch (error: any) {
      showToast(error.message || 'Add failed', 'error');
    }
  };

  // Delete tech stack
  const handleDeleteTechStack = async (id: string) => {
    try {
      await techStacksApi.delete(id);
      setTechStacks(prev => prev.filter(s => s.id !== id));
      showToast('Tech stack deleted', 'success');
    } catch (error) {
      showToast('Delete failed', 'error');
    }
  };

  // Toggle tech stack
  const handleToggleTechStack = async (id: string) => {
    try {
      const updated = await techStacksApi.toggle(id);
      setTechStacks(prev => prev.map(s => s.id === id ? updated : s));
    } catch (error) {
      showToast('Toggle failed', 'error');
    }
  };

  // Manual check
  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await triggerVulnerabilityCheck();
      showToast('Vulnerability scan triggered', 'success');
      setTimeout(loadData, 8000);
    } catch (error) {
      showToast('Scan trigger failed', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <div className="min-h-screen bg-[#050510] relative overflow-hidden">
      <BackgroundBeams className="z-0" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#dc2626" />

      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 left-1/2 z-50 px-5 py-3 rounded-xl backdrop-blur-xl flex items-center gap-3 shadow-2xl",
              toast.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            )}
          >
            {toast.type === 'success' ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-red-400" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-400 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">VulnPulse</h1>
                <p className="text-sm text-slate-500">Vulnerability Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "relative p-2.5 rounded-xl transition-all",
                    showNotifications ? "bg-white/10 text-white" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#0d0d20]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
                    >
                      <div className="p-3 border-b border-white/5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                      ) : (
                        notifications.slice(0, 15).map(n => (
                          <div key={n.id} className={cn("p-3 border-b border-white/5 text-sm", !n.isRead && "bg-white/[0.02]")}>
                            <p className="text-white font-medium">{n.title}</p>
                            <p className="text-slate-500 text-xs mt-1">{n.content.slice(0, 100)}</p>
                            <p className="text-slate-600 text-[10px] mt-1">{relativeTime(new Date(n.createdAt))}</p>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
                {isChecking ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 bg-white/[0.02] border border-white/5 rounded-xl p-1 w-fit">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
            { id: 'tech-stacks' as const, label: 'Tech Stacks', icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Bug className="w-5 h-5" />} label="Total CVEs" value={stats?.total ?? 0} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Discovered Today" value={stats?.today ?? 0} color="text-cyan-400" bg="bg-cyan-500/10" border="border-cyan-500/20" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Critical" value={stats?.critical ?? 0} color="text-red-400" bg="bg-red-500/10" border="border-red-500/20" />
              <StatCard icon={<Layers className="w-5 h-5" />} label="Active Stacks" value={techStacks.filter(s => s.isActive).length} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
            </div>

            {/* Filters */}
            <FilterSortBar filters={dashboardFilters} onChange={setDashboardFilters} techStacks={techStacks} />

            {/* Vulnerability Feed */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
              </div>
            ) : vulnerabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No vulnerabilities found</p>
                <p className="text-sm mt-1">Add tech stacks and run a scan to discover vulnerabilities</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vulnerabilities.map((vuln) => {
                  const sev = getSeverityConfig(vuln.severity);
                  return (
                    <motion.div
                      key={vuln.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
                        "bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors"
                      )}
                    >
                      <div className="p-5 space-y-3">
                        {/* Top row: Severity + Source + CVE */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider", sev.bg, sev.color, sev.border, "border")}>
                            {vuln.cvssScore != null ? `${sev.label} (${vuln.cvssScore})` : sev.label}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[11px]">
                            {getSourceIcon(vuln.source)}
                            {getSourceLabel(vuln.source)}
                          </span>
                          {vuln.cveId && (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[11px] font-mono">
                              {vuln.cveId}
                            </span>
                          )}
                          {vuln.exploitability && vuln.exploitability !== 'none' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-medium border border-red-500/20">
                              Exploit: {vuln.exploitability}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-white leading-snug">
                          <a href={vuln.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                            {vuln.title}
                          </a>
                        </h3>

                        {/* CVSS Bar */}
                        {vuln.cvssScore != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-20">CVSS {vuln.cvssScore}/10</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", vuln.cvssScore >= 9 ? 'bg-red-500' : vuln.cvssScore >= 7 ? 'bg-orange-500' : vuln.cvssScore >= 4 ? 'bg-amber-500' : 'bg-emerald-500')}
                                style={{ width: `${Math.min(vuln.cvssScore * 10, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* AI Summary */}
                        {vuln.aiSummary && (
                          <p className="text-sm text-slate-400">{vuln.aiSummary}</p>
                        )}

                        {/* Version info */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {vuln.affectedVersions && <span>Affected: <span className="text-red-400">{vuln.affectedVersions}</span></span>}
                          {vuln.patchedVersion && <span>Fix: <span className="text-emerald-400">{vuln.patchedVersion}</span></span>}
                        </div>

                        {/* Expandable Impact */}
                        {vuln.aiImpact && (
                          <div>
                            <button onClick={() => toggleSection(setExpandedImpacts, vuln.id)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                              {expandedImpacts.has(vuln.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              Impact Analysis
                            </button>
                            {expandedImpacts.has(vuln.id) && (
                              <p className="mt-2 text-sm text-orange-300/80 bg-orange-500/5 rounded-lg p-3 border border-orange-500/10">{vuln.aiImpact}</p>
                            )}
                          </div>
                        )}

                        {/* Expandable Remediation */}
                        {vuln.aiRemediation && (
                          <div>
                            <button onClick={() => toggleSection(setExpandedRemediations, vuln.id)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                              {expandedRemediations.has(vuln.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              Remediation
                            </button>
                            {expandedRemediations.has(vuln.id) && (
                              <p className="mt-2 text-sm text-emerald-300/80 bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">{vuln.aiRemediation}</p>
                            )}
                          </div>
                        )}

                        {/* Tech Stack tags + Timestamps */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {vuln.techStacks?.map(ts => (
                              <span key={ts.techStack.id} className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-medium",
                                ts.isAffected ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/5 text-slate-500"
                              )}>
                                {ts.techStack.name}{ts.techStack.version ? ` ${ts.techStack.version}` : ''}
                                {ts.matchConfidence != null && ` · ${ts.matchConfidence}%`}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-600">
                            {vuln.publishedAt && <span>Published {relativeTime(new Date(vuln.publishedAt))}</span>}
                            <span>Discovered {relativeTime(new Date(vuln.createdAt))}</span>
                            <a href={vuln.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors">
                              <ExternalLink className="w-3 h-3" /> Details
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tech Stacks Tab */}
        {activeTab === 'tech-stacks' && (
          <div className="space-y-6">
            {/* Add Form */}
            <form onSubmit={handleAddTechStack} className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Name</label>
                <input
                  type="text" value={newStackName} onChange={e => setNewStackName(e.target.value)}
                  placeholder="e.g. React"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 w-48"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Version (optional)</label>
                <input
                  type="text" value={newStackVersion} onChange={e => setNewStackVersion(e.target.value)}
                  placeholder="e.g. 18.2.0"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 w-32"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Category</label>
                <select
                  value={newStackCategory} onChange={e => setNewStackCategory(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 w-36"
                >
                  <option value="" className="bg-[#0d0d20]">Select...</option>
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c} className="bg-[#0d0d20]">{c}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={!newStackName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-all disabled:opacity-40">
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {/* Tech Stack Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {techStacks.length === 0 ? (
                <div className="col-span-full text-center py-16 text-slate-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No tech stacks registered</p>
                  <p className="text-sm mt-1">Add your tech stacks to start monitoring vulnerabilities</p>
                </div>
              ) : (
                techStacks.map(stack => (
                  <div key={stack.id} className={cn(
                    "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
                    "bg-white/[0.02] border-white/5 hover:border-white/10 transition-all"
                  )}>
                    <Meteors number={5} className="opacity-30" />
                    <div className="relative p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{stack.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {stack.version && (
                              <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-xs font-mono">{stack.version}</span>
                            )}
                            {stack.category && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs">{stack.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleTechStack(stack.id)}
                            className={cn(
                              "w-10 h-6 rounded-full transition-colors relative",
                              stack.isActive ? "bg-emerald-500/30" : "bg-white/10"
                            )}>
                            <div className={cn(
                              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                              stack.isActive ? "left-[18px]" : "left-0.5"
                            )} />
                          </button>
                          <button onClick={() => handleDeleteTechStack(stack.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className={cn(stack.isActive ? "text-emerald-400" : "text-slate-600")}>
                          {stack.isActive ? 'Active' : 'Paused'}
                        </span>
                        {stack._count && (
                          <span>{stack._count.vulnerabilities} vulnerabilities found</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, border }: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <div className={cn("rounded-2xl border backdrop-blur-sm p-5", "bg-white/[0.02]", border)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg, border, "border")}>
          <div className={color}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
