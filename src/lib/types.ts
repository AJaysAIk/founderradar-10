// Domain types mirrored from supabase/schema.sql

export type SignalStatus = "scanning" | "completed" | "failed";

export interface Citation {
  quote: string;
  source: string;
  url: string | null;
  weight: number; // 0-1
  signal: "pain" | "spend" | "workaround" | "churn";
}

export interface RoadmapPhase {
  phase: string;
  weeks: number;
  objective: string;
  kill_criteria: string;
}

export interface TargetPersona {
  role: string;
  company_size: string;
  budget_band: string;
  watering_holes: string[];
}

export interface RiskProfile {
  failure_traps: Array<{ trap: string; why_it_kills: string; severity: number }>;
  distribution_bottlenecks: Array<{ channel: string; bottleneck: string }>;
  kill_question: string;
  survivability: number;
}

export interface OutreachScript {
  channel: "email" | "x" | "linkedin" | "reddit";
  subject: string;
  body: string;
  persona_hook: string;
  follow_up?: string;
}

export interface MarketPotential {
  tam_note: string;
  sam_note: string;
  wedge: string;
  pricing_anchor: string;
}

export interface MvpFeature {
  feature: string;
  why: string;
  effort: "S" | "M" | "L";
}

export interface Gtm {
  motion: string;
  channels: string[];
  first_10_customers: string;
}

export interface ScoreBreakdown {
  frequency: number;
  urgency: number;
  severity: number;
  willingness_to_pay: number;
  founder_fit: number;
}

export interface SprintTask {
  day: number;
  task: string;
  goal: string;
  done: boolean;
}

export interface ValidationPlan {
  interview_questions: string[];
  assumptions: Array<{ assumption: string; test: string; kill_threshold: string }>;
  sprint: SprintTask[];
}

export interface UkSetup {
  structure: string;
  companies_house: string;
  hmrc: string;
  vat: string;
  insurance: string;
  first_invoice: string;
}

export type ScanMode = "manual" | "web";

export type ContactStage =
  | "identified"
  | "contacted"
  | "replied"
  | "call_booked"
  | "pilot"
  | "churned";

export interface FounderContact {
  id: string;
  user_id: string;
  build_signal_id: string;
  full_name: string;
  company: string | null;
  role: string | null;
  channel: string;
  stage: ContactStage;
  lead_metrics: { fit_score?: number; intent_score?: number; acv_estimate?: number };
  milestones: Array<{ at: string; kind: string; note: string }>;
  last_touch_at: string | null;
  next_touch_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotFeedback {
  id: string;
  user_id: string;
  build_signal_id: string | null;
  contact_id: string | null;
  nps: number | null;
  pmf_score: number | null; // 1-4 "very disappointed" ladder
  scores: { accuracy?: number; speed?: number; citations_trust?: number };
  verbatim: string | null;
  created_at: string;
}

export interface ProspectResult {
  name: string;
  role: string;
  company: string;
  region: string;
  why_relevant: string;
  source_url: string;
  channel: "email" | "linkedin" | "x" | "reddit" | "web";
  opener: string;
}

export interface Testimonial {
  id: string;
  created_at: string;
  user_id: string | null;
  full_name: string;
  role_company: string | null;
  email: string | null;
  rating: number;          // 1-10
  would_miss: number | null; // 1-3
  quote: string;
  consent_quote: boolean;
  source: "public" | "in_app";
}

export interface TestimonialInput {
  full_name: string;
  role_company?: string | null;
  email?: string | null;
  rating: number;
  would_miss?: number | null;
  quote: string;
  consent_quote: boolean;
  source?: "public" | "in_app";
}

export interface WaitlistEntry {
  id: string;
  created_at: string;
  email: string;
  ref: string;
  user_agent: string | null;
  note: string | null;
}

export interface OwnerStats {
  waitlist_total: number;
  signals_total: number;
  signals_completed: number;
  scans_today: number;
  contacts_total: number;
  testimonials_total: number;
  active_users: number;
}

export interface PainSignalInput {
  raw_text: string;
  source: string;
  source_url?: string | null;
  mode?: ScanMode;
}

export interface BuildSignal {
  id: string;
  user_id: string;
  pain_signal_id: string | null;
  problem_statement: string;
  validation_score: number | null;
  target_persona: TargetPersona | Record<string, never>;
  roadmap: RoadmapPhase[];
  risk_profile: RiskProfile | Record<string, never>;
  citations: Citation[];
  outreach_scripts: OutreachScript[];
  market_potential: MarketPotential | Record<string, never>;
  mvp_features: MvpFeature[];
  gtm: Gtm | Record<string, never>;
  scan_mode: ScanMode;
  score_breakdown: ScoreBreakdown | Record<string, never>;
  validation_plan: ValidationPlan | Record<string, never>;
  uk_setup: UkSetup | Record<string, never>;
  status: SignalStatus;
  status_detail: string | null;
  scan_started_at: string | null;
  scan_finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PersonaId = "cfo" | "cto" | "user" | "founder";

export interface BoardTurn {
  persona: PersonaId;
  line: string;
  metric?: string;
}
