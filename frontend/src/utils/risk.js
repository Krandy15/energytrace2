export function formatRiskScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return "0.0%";
  }
  const numeric = Number(score);
  const normalized = numeric <= 1 ? numeric * 100 : numeric;
  return `${normalized.toFixed(1)}%`;
}

export function getRiskLevel(score) {
  const numeric = Number(score) || 0;
  const normalized = numeric > 1 ? numeric / 100 : numeric;

  if (normalized >= 0.75) {
    return {
      level: "CRITICAL",
      label: "Critical",
      color: "var(--risk-critical, #ef4444)",
      bgVar: "var(--risk-critical-bg, rgba(239, 68, 68, 0.15))",
      borderVar: "var(--risk-critical-border, #ef4444)",
      badgeClass: "badge-critical"
    };
  }
  if (normalized >= 0.5) {
    return {
      level: "HIGH",
      label: "High",
      color: "var(--risk-high, #f97316)",
      bgVar: "var(--risk-high-bg, rgba(249, 115, 22, 0.15))",
      borderVar: "var(--risk-high-border, #f97316)",
      badgeClass: "badge-high"
    };
  }
  if (normalized >= 0.25) {
    return {
      level: "MEDIUM",
      label: "Medium",
      color: "var(--risk-medium, #eab308)",
      bgVar: "var(--risk-medium-bg, rgba(234, 179, 8, 0.15))",
      borderVar: "var(--risk-medium-border, #eab308)",
      badgeClass: "badge-medium"
    };
  }
  return {
    level: "LOW",
    label: "Low",
    color: "var(--risk-low, #22c55e)",
    bgVar: "var(--risk-low-bg, rgba(34, 197, 94, 0.15))",
    borderVar: "var(--risk-low-border, #22c55e)",
    badgeClass: "badge-low"
  };
}

export function getRiskColor(score) {
  return getRiskLevel(score).color;
}

export function riskColorVar(score) {
  return getRiskLevel(score).color;
}

export function riskBgVar(score) {
  return getRiskLevel(score).bgVar;
}

export function riskBorderVar(score) {
  return getRiskLevel(score).borderVar;
}

export function getRiskBadgeClass(score) {
  return getRiskLevel(score).badgeClass;
}

export function riskBadgeClass(score) {
  return getRiskLevel(score).badgeClass;
}

export function riskLabel(score) {
  return getRiskLevel(score).label;
}

export const riskColor = getRiskColor;
export const riskLevel = getRiskLevel;
export const formatScore = formatRiskScore;

export default {
  formatRiskScore,
  getRiskLevel,
  getRiskColor,
  riskColorVar,
  riskBgVar,
  riskBorderVar,
  getRiskBadgeClass,
  riskBadgeClass,
  riskLabel
};