import {
  Activity,
  CalendarCheck,
  ClipboardList,
  Radar,
  Search,
  LayoutDashboard,
  HeartPulse,
  ClipboardCheck,
  Bot,
  BookOpen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type WorkflowStage = "Monitor" | "Detect" | "Investigate" | "Act" | "Follow Up";

export const WORKFLOW: WorkflowStage[] = ["Monitor", "Detect", "Investigate", "Act", "Follow Up"];

export interface NavItem {
  key: string;
  label: string;
  /** Shorter label for the mobile tab bar */
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  /** Feature(s) from the 8-feature plan that live on this tab */
  features: string[];
  stage: WorkflowStage | "Foundation" | "Prevent";
  description: string;
}

/**
 * The five stages of the core workflow, each with an icon, a one-line caption and
 * the screen where that stage mostly happens. Used by the welcome banner and the
 * footer so both show the same five icons.
 */
export interface StageItem {
  stage: WorkflowStage;
  icon: LucideIcon;
  caption: string;
  href: string;
  /** Short screen name, for the footer link */
  where: string;
}

export const WORKFLOW_STAGES: StageItem[] = [
  { stage: "Monitor", icon: Activity, caption: "Trends against your own baseline", href: "/dashboard", where: "Dashboard" },
  { stage: "Detect", icon: Radar, caption: "Published red flags first, then drift", href: "/alerts", where: "Early detection" },
  { stage: "Investigate", icon: Search, caption: "Plain, cautious help to explore a concern", href: "/assistant", where: "Assistant" },
  { stage: "Act", icon: ClipboardList, caption: "Clear next steps and who to contact", href: "/actions#do", where: "Action plan" },
  { stage: "Follow Up", icon: CalendarCheck, caption: "Review what has changed", href: "/actions#improvement", where: "Follow-up" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    features: ["Health Monitoring Dashboard", "Early Detection", "Action and Follow-Up"],
    stage: "Monitor",
    description:
      "Trends against your personal baseline, with established red-flag checks shown first.",
  },
  {
    key: "health",
    label: "Health",
    shortLabel: "Health",
    href: "/health",
    icon: HeartPulse,
    features: ["Personal Health Profile"],
    stage: "Foundation",
    description: "Your profile, personal baselines, and how each measurement was obtained.",
  },
  {
    key: "check-in",
    label: "Daily Check-In",
    shortLabel: "Check-in",
    href: "/check-in",
    icon: ClipboardCheck,
    features: ["Intelligent Daily Questions"],
    stage: "Detect",
    description:
      "Short daily questions that adapt to what you report. Validated questionnaires are available but never auto-scheduled.",
  },
  {
    key: "assistant",
    label: "Assistant",
    shortLabel: "Assistant",
    href: "/assistant",
    icon: Bot,
    features: ["Medical Assistant"],
    stage: "Investigate",
    description:
      "Plain-language help to explore a concern. It uses cautious wording and never gives a diagnosis.",
  },
  {
    key: "learn",
    label: "Learn",
    shortLabel: "Learn",
    href: "/learn",
    icon: BookOpen,
    features: ["Spaceflight Hazard Awareness and Prevention"],
    stage: "Prevent",
    description:
      "Background on spaceflight health hazards and prevention, with sources and open questions stated.",
  },
  {
    key: "crew",
    label: "Crew",
    shortLabel: "Crew",
    href: "/crew",
    icon: Users,
    features: ["Crew Health Awareness"],
    stage: "Monitor",
    description:
      "Environmental, mission-level awareness. Not individual crew health records.",
  },
];

export function getNavItem(key: string): NavItem {
  const item = NAV_ITEMS.find((n) => n.key === key);
  if (!item) throw new Error(`Unknown nav item: ${key}`);
  return item;
}
