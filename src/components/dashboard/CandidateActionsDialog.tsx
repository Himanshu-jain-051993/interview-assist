"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Candidate, CandidateStatus } from "@/lib/types";
import {
  User,
  Briefcase,
  BookOpen,
  Quote,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Gauge,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Rejected",
];

const ROUND_TYPES = [
  { value: "Screening",    label: "Screening" },
  { value: "Technical_1",  label: "Technical Round 1" },
  { value: "Technical_2",  label: "Technical Round 2" },
  { value: "Culture_Fit",  label: "Culture Fit" },
];

const STAGE_COLORS: Record<CandidateStatus, string> = {
  Applied:              "bg-slate-100 text-slate-700",
  Screening:            "bg-blue-100 text-blue-700",
  Shortlisted:          "bg-emerald-100 text-emerald-700",
  "Interview Scheduled":"bg-violet-100 text-violet-700",
  Rejected:             "bg-rose-100 text-rose-700",
};

const ROUND_LABEL: Record<string, string> = {
  Screening:   "Screening",
  Technical_1: "Technical R1",
  Technical_2: "Technical R2",
  Culture_Fit: "Culture Fit",
};

const ROUND_COLOR: Record<string, string> = {
  Screening:   "bg-sky-100 text-sky-700 border-sky-200",
  Technical_1: "bg-violet-100 text-violet-700 border-violet-200",
  Technical_2: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Culture_Fit: "bg-amber-100 text-amber-700 border-amber-200",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface InterviewRound {
  id: string;
  round_type: string;
  cumulative_score: number | null;
  ai_feedback_json: any;
  created_at: string;
}

interface CandidateActionsDialogProps {
  candidate: Candidate | null;
  currentStatus: CandidateStatus;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: CandidateStatus) => void;
  onOpenGuide: (c: Candidate) => void;
}

// ── Circular Score Gauge ────────────────────────────────────────────────────

function ScoreGauge({ value, label }: { value: number; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 10) * circ;
  const color =
    value >= 8 ? "#10b981" : value >= 6 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Round Card (expandable) ────────────────────────────────────────────────

function RoundCard({ round, index }: { round: InterviewRound; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const fb = round.ai_feedback_json;
  const score = round.cumulative_score;
  const color = ROUND_COLOR[round.round_type] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors focus:outline-none"
      >
        {/* Timeline indicator */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
            {index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-semibold ${color} border`}>
              {ROUND_LABEL[round.round_type] ?? round.round_type}
            </Badge>
            {fb?.cumulativeDelta && (
              <span className="text-[10px] text-slate-400">
                {new Date(round.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            )}
          </div>
          {fb?.evaluationSummary && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed truncate">
              {fb.evaluationSummary}
            </p>
          )}
        </div>

        {/* Score badge */}
        {score !== null && score !== undefined && (
          <div className="shrink-0 text-right">
            <span
              className={`text-sm font-bold tabular-nums ${
                score >= 8 ? "text-emerald-600" : score >= 6 ? "text-amber-600" : "text-rose-600"
              }`}
            >
              {score.toFixed(1)}<span className="text-slate-400 font-normal text-xs">/10</span>
            </span>
          </div>
        )}

        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && fb && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-5 bg-slate-50/30">
          {/* Scores row */}
          <div className="flex items-center justify-around flex-wrap bg-white rounded-lg p-3 border border-slate-200">
            {fb.roundScore && <ScoreGauge value={fb.roundScore} label="Round Score" />}
            {fb.cumulativeScore && <ScoreGauge value={fb.cumulativeScore} label="Cumulative" />}
            {fb.hiringConfidenceIndex !== undefined && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <Gauge className="w-10 h-10 text-slate-300" />
                  <span className="absolute text-xs font-bold text-slate-700">
                    {fb.hiringConfidenceIndex}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Confidence</span>
              </div>
            )}
          </div>

          {/* Narrative */}
          {fb.cumulativeNarrative && (
            <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-3 italic">
              "{fb.cumulativeNarrative}"
            </p>
          )}

          {/* Recommended next step */}
          {fb.recommendedNextStep && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Recommendation:
              </span>
              <span className="text-sm font-medium text-slate-800">{fb.recommendedNextStep}</span>
            </div>
          )}

          {/* Strengths/Gaps */}
          <div className="grid grid-cols-2 gap-4">
            {fb.keyStrengths?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Strengths
                </span>
                {fb.keyStrengths.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600">{s}</p>
                  </div>
                ))}
              </div>
            )}
            {fb.keyGaps?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Gaps
                </span>
                {fb.keyGaps.map((g: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-black text-sm shrink-0 leading-none">!</span>
                    <p className="text-xs text-slate-600">{g}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rubric evaluations */}
          {fb.rubricEvaluations?.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Rubric Breakdown
              </span>
              <div className="space-y-2">
                {fb.rubricEvaluations.map((re: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{re.parameter}</span>
                      <div className="flex items-center gap-2">
                        {re.cumulativeDelta && re.cumulativeDelta !== "Unchanged" && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            re.cumulativeDelta.includes("Validated") || re.cumulativeDelta.includes("Mitigated") || re.cumulativeDelta.includes("Strong")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {re.cumulativeDelta}
                          </span>
                        )}
                        <span className={`text-sm font-bold tabular-nums ${
                          re.weightedScore >= 8 ? "text-emerald-600" : re.weightedScore >= 6 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {re.weightedScore}/10
                        </span>
                      </div>
                    </div>
                    {re.currentEvidence && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded">{re.currentEvidence}</p>
                    )}
                    {re.humanWeightingApplied && re.humanWeightingReason && (
                      <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1">
                        <span className="shrink-0 text-amber-500 font-bold">⚖</span>
                        <p>Human weighting applied: {re.humanWeightingReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add New Round Form ─────────────────────────────────────────────────────

function AddRoundForm({
  candidateId,
  roleId,
  onSuccess,
  onCancel,
}: {
  candidateId: string;
  roleId: string;
  onSuccess: (round: InterviewRound) => void;
  onCancel: () => void;
}) {
  const [roundType, setRoundType] = useState("");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!roundType) { toast.error("Please select a round type"); return; }
    if (!transcript.trim() && !notes.trim()) { toast.error("Please provide transcript or notes"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/interview-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, roleId, roundType, transcriptText: transcript, interviewerNotes: notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Failed");
      }
      const data = await res.json();
      toast.success("Evaluation complete", { description: `Cumulative score: ${data.round.cumulativeScore?.toFixed(1) ?? "N/A"}/10` });
      onSuccess(data.round);
    } catch (err: any) {
      toast.error("Evaluation failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4 shadow-sm w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800">New Interview Round</span>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-slate-500 h-7 px-3 hover:bg-slate-100">Cancel</Button>
      </div>

      {/* Round type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">Round Type</label>
        <Select value={roundType} onValueChange={setRoundType}>
          <SelectTrigger className="h-9 text-sm border-slate-200">
            <SelectValue placeholder="Select round…" />
          </SelectTrigger>
          <SelectContent>
            {ROUND_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select> // Dropdown for round type added
      </div>

      {/* Interviewer notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Interviewer Notes <span className="text-slate-400 font-normal ml-1">(weighted at 70%)</span>
        </label>
        <Textarea
          placeholder="Key observations, concerns, and standout moments…"
          className="text-sm resize-none border-slate-200 min-h-[100px] leading-relaxed"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Transcript */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Interview Transcript <span className="text-slate-400 font-normal ml-1">(optional — paste text)</span>
        </label>
        <Textarea
          placeholder="Paste the interview transcript here…"
          className="text-sm resize-none border-slate-200 min-h-[120px] leading-relaxed font-mono"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !roundType}
        className="w-full h-10 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Evaluation…</>
        ) : (
          <><FileText className="w-4 h-4 mr-2" /> Generate Cumulative Feedback</>
        )}
      </Button>
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────

export function CandidateActionsDialog({
  candidate,
  currentStatus,
  isOpen,
  onClose,
  onStatusChange,
  onOpenGuide,
}: CandidateActionsDialogProps) {
  const [status, setStatus] = useState<CandidateStatus>(currentStatus);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync status when candidate changes
  useEffect(() => { setStatus(currentStatus); }, [currentStatus]);

  // Fetch rounds when dialog opens
  useEffect(() => {
    if (!isOpen || !candidate) return;
    setLoadingRounds(true);
    fetch(`/api/interview-rounds?candidateId=${candidate.id}`)
      .then((r) => r.json())
      .then((d) => setRounds(d.rounds ?? []))
      .catch((err) => console.error("Error fetching rounds:", err))
      .finally(() => setLoadingRounds(false));
  }, [isOpen, candidate]);

  const handleStatusChange = useCallback(async (newStatus: CandidateStatus) => {
    if (!candidate) return;
    const prev = status;
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      onStatusChange(candidate.id, newStatus);
      toast.success("Stage updated", { description: `${candidate.name} → ${newStatus}` });
    } catch {
      setStatus(prev);
      toast.error("Could not update stage. Please try again.");
    }
  }, [candidate, status, onStatusChange]);

  const handleRoundAdded = (round: InterviewRound) => {
    setRounds((prev) => [...prev, round]);
    setShowAddForm(false);
  };

  if (!candidate) return null;

  const latestRound = rounds[rounds.length - 1];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setShowAddForm(false);
        onClose();
      }
    }}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl shadow-2xl border border-slate-200 bg-slate-50">

        {/* ── Header ───────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug truncate">
                  {candidate.name}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge className={`font-semibold text-[11px] py-0.5 px-2.5 ${STATUS_COLORS[currentStatus]}`}>
                    {currentStatus}
                  </Badge>
                  {candidate.resume_score !== null && (
                    <Badge variant="outline" className="text-[11px] border-slate-200 font-semibold text-slate-600">
                      {candidate.resume_score}% Match
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Stage selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500">Move Stage:</label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as CandidateStatus)}>
                  <SelectTrigger className="h-8 text-xs border-slate-200 w-44 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interview Guide shortcut */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 w-full"
                onClick={() => { onClose(); onOpenGuide(candidate); }}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Open Interview Guide
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Tabs defaultValue="rounds" className="h-full flex flex-col">
            {/* ── Tab Bar ── */}
            <TabsList className="shrink-0 justify-start gap-8 rounded-none border-b border-slate-200 bg-white px-8 pb-0 h-12 pt-0 w-full">
              <TabsTrigger value="rounds" className="relative -mb-px px-0 py-3 text-sm font-semibold rounded-none border-b-2 border-transparent text-slate-500 data-[state=active]:text-indigo-700 data-[state=active]:border-b-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors h-full flex items-center gap-2">
                Interview Rounds
                <span className="inline-flex h-5 min-w-[1.25rem] px-1.5 items-center justify-center rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  {rounds.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="relative -mb-px px-0 py-3 text-sm font-semibold rounded-none border-b-2 border-transparent text-slate-500 data-[state=active]:text-indigo-700 data-[state=active]:border-b-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors h-full">
                Resume Profile
              </TabsTrigger>
            </TabsList>

            {/* ── Interview Rounds Tab ─────────────────────────── */}
            <TabsContent value="rounds" className="flex-1 min-h-0 overflow-y-auto mt-0 outline-none focus-visible:ring-0">
              <div className="px-8 py-6 space-y-6 max-w-5xl mx-auto w-full">

                {/* Header row + Add New Button */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" /> Evaluation Timeline
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Sequential interview feedback driven by human notes & AI analysis.</p>
                  </div>
                  {!showAddForm && (
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="h-9 px-4 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add New Round
                    </Button>
                  )}
                </div>

                {/* Add Round Form */}
                {showAddForm && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <AddRoundForm
                      candidateId={candidate.id}
                      roleId={candidate.roleId}
                      onSuccess={handleRoundAdded}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </div>
                )}

                {/* Rounds timeline */}
                {loadingRounds ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <span className="text-sm font-medium">Loading evaluation history…</span>
                  </div>
                ) : rounds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3 bg-white rounded-xl border border-slate-200 border-dashed">
                    <FileText className="w-12 h-12 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-600">No interview rounds recorded</p>
                    <p className="text-xs text-slate-500">Record the first interview to begin generating cumulative feedback.</p>
                  </div>
                ) : (
                  <div className="relative pl-3 pt-2">
                    {/* Connecting line */}
                    <div className="absolute left-[24px] top-4 bottom-4 w-0.5 bg-indigo-100 z-0 rounded-full" />
                    
                    <div className="relative z-10 space-y-6">
                      {rounds.map((round, i) => (
                        <div key={round.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <RoundCard round={round} index={i} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="h-8" />
              </div>
            </TabsContent>

            {/* ── Profile Tab ──────────────────────────────────── */}
            <TabsContent value="profile" className="flex-1 min-h-0 overflow-y-auto mt-0 outline-none focus-visible:ring-0">
              <div className="px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">

                {/* Resume Summary */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Quote className="w-4 h-4" /> Resume Summary
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 italic shadow-sm">
                    &ldquo;{candidate.resume_summary || "No summary available."}&rdquo;
                  </p>
                </section>

                {/* Work Experience */}
                <section>
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Work Experience
                  </h3>
                  <div className="space-y-6">
                    {candidate.profile_data.experience.map((exp, i) => (
                      <div key={i} className="border-l-2 border-indigo-200 pl-5 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">{exp.role}</h4>
                            <p className="text-sm text-slate-600 font-medium">{exp.company}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded shrink-0 border border-slate-200">
                            {exp.duration}
                          </span>
                        </div>
                        <ul className="space-y-1.5 mt-2">
                          {exp.achievements.map((ach, j) => (
                            <li key={j} className="text-sm text-slate-600 flex gap-2.5 leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{ach}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Education */}
                <section>
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Education
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {candidate.profile_data.education.map((edu, i) => (
                      <div key={i} className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-4 shadow-sm">
                        <p className="text-sm font-bold text-slate-900">{edu.school}</p>
                        <p className="text-xs text-amber-800 font-medium mt-1">{edu.degree}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="h-8" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
