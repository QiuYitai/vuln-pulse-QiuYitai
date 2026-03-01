import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, Filter, X, Clock, Shield, ChevronDown, Check, RotateCcw, AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { TechStack } from '../services/api';

export interface FilterState {
  source: string;
  severity: string;
  techStackId: string;
  timeRange: string;
  sortBy: string;
  sortOrder: string;
}

export const defaultFilterState: FilterState = {
  source: '',
  severity: '',
  techStackId: '',
  timeRange: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

interface FilterSortBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  techStacks: TechStack[];
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Latest Discovered', icon: Clock },
  { value: 'publishedAt', label: 'Latest Published', icon: Clock },
  { value: 'cvssScore', label: 'CVSS Score', icon: AlertTriangle },
  { value: 'severity', label: 'Severity', icon: Shield },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'nvd', label: 'NVD' },
  { value: 'github', label: 'GitHub Advisory' },
  { value: 'cve_circl', label: 'CVE.org' },
  { value: 'security_blog', label: 'Security Blogs' },
  { value: 'twitter', label: 'Twitter' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'CRITICAL', color: 'text-red-400' },
  { value: 'high', label: 'HIGH', color: 'text-orange-400' },
  { value: 'medium', label: 'MEDIUM', color: 'text-amber-400' },
  { value: 'low', label: 'LOW', color: 'text-emerald-400' },
  { value: 'none', label: 'NONE', color: 'text-slate-400' },
];

const TIME_RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '1h', label: 'Last 1 hour' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

function Dropdown({
  label, value, options, onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string; color?: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const isActive = value !== '';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
          isActive
            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
            : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-slate-300"
        )}
      >
        <span>{isActive ? selected?.label : label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 min-w-[160px] bg-[#0d0d20]/98 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                    value === option.value
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {value === option.value && <Check className="w-3 h-3 shrink-0" />}
                  <span className={cn(option.color)}>{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilterSortBar({ filters, onChange, techStacks }: FilterSortBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.source, filters.severity, filters.techStackId, filters.timeRange,
  ].filter(v => v !== '').length;

  const hasNonDefaultSort = filters.sortBy !== 'createdAt';

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onChange({ ...defaultFilterState });
  };

  const techStackOptions = [
    { value: '', label: 'All Tech Stacks' },
    ...techStacks.filter(k => k.isActive).map(k => ({ value: k.id, label: `${k.name}${k.version ? ' ' + k.version : ''}` })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort Selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl border border-white/5 p-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 ml-2" />
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => update('sortBy', opt.value)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  filters.sortBy === opt.value
                    ? "bg-blue-500/15 text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
            showFilters || activeFilterCount > 0
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {(activeFilterCount > 0 || hasNonDefaultSort) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}

        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.source && (
              <FilterTag label={SOURCE_OPTIONS.find(o => o.value === filters.source)?.label || filters.source} onRemove={() => update('source', '')} />
            )}
            {filters.severity && (
              <FilterTag label={SEVERITY_OPTIONS.find(o => o.value === filters.severity)?.label || filters.severity} onRemove={() => update('severity', '')} />
            )}
            {filters.techStackId && (
              <FilterTag label={techStacks.find(k => k.id === filters.techStackId)?.name || 'Tech Stack'} onRemove={() => update('techStackId', '')} />
            )}
            {filters.timeRange && (
              <FilterTag label={TIME_RANGE_OPTIONS.find(o => o.value === filters.timeRange)?.label || filters.timeRange} onRemove={() => update('timeRange', '')} />
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Dropdown label="Source" value={filters.source} options={SOURCE_OPTIONS} onChange={(v) => update('source', v)} />
              <Dropdown label="Severity" value={filters.severity} options={SEVERITY_OPTIONS} onChange={(v) => update('severity', v)} />
              <Dropdown label="Tech Stack" value={filters.techStackId} options={techStackOptions} onChange={(v) => update('techStackId', v)} />
              <Dropdown label="Time" value={filters.timeRange} options={TIME_RANGE_OPTIONS} onChange={(v) => update('timeRange', v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
