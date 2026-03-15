"use client";

import { useState, useRef, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Candidate, CandidateStatus } from "@/lib/types";
import {
  CheckCircle2,
  BookOpen,
  Briefcase,
  Upload,
  FileText,
  Loader2,
  BarChart3,
  MessageSquareText,
  User,
  Quote,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Rejected",
];

// Stages at/after "Interview Scheduled" unlock transcript + guide
const ADVANCED_STAGES: CandidateStatus[] = ["Interview Scheduled", "Rejected"];

const STATUS_COLORS: Record<CandidateStatus, string> = {
  Applied:               "bg-slate-100 text-slate-700 border-slate-200",
  Screening:             "bg-blue-100 text-blue-700 border-blue-200",
  Shortlisted:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Interview Scheduled": "bg-violet-100 text-violet-700 border-violet-200",
  Rejected:              "bg-rose-100 text-rose-700 border-rose-200",
};

interface DialogueTurn {
  speakerRole: "Interviewer" | "Candidate";
  mainQuestion?: string;
  answerSummary?: string;
  followUps: Array<{ question: string; response: string }>;
}

interface SynthesisResult {
  roleContext: string;
  candidateName: string;
  totalTurns: number;
  dialogueMap: DialogueTurn[];
  keyMetrics: string[];
  overallSignals: { strengths: string[]; concerns: string[] };
}

interface CandidateActionsDialogProps {
  candidate: Candidate | null;
  currentStatus: CandidateStatus;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: CandidateStatus) => void;
  onOpenGuide: (candidate: Candidate) => void;
}

export function CandidateActionsDialog({
  candidate,
  currentStatus,
  isOpen,
  onClose,
  onStatusChange,
  onOpenGuide,
}: CandidateActionsDialogProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdvanced = ADVANCED_STAGES.includes(currentStatus);

  // ── Status update ──────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: CandidateStatus) => {
    if (!candidate) return;
    const prev = currentStatus;
    onStatusChange(candidate.id, newStatus); // optimistic update in parent

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Stage updated", {
        description: `${candidate.name} moved to ${newStatus}`,
      });
    } catch {
      onStatusChange(candidate.id, prev); // rollback
      toast.error("Could not update stage. Please try again.");
    }
  };

  // ── File upload ────────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      if (!candidate) return;
      const allowed = [".pdf", ".docx", ".txt"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error("Unsupported file", { description: "Upload a .pdf, .docx, or .txt file." });
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      setSynthesis(null);

      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 7, 85));
      }, 700);

      try {
        const form = new FormData();
        form.append("file", file);
        form.append("candidateId", candidate.id);

        const res = await fetch("/api/process-transcript", { method: "POST", body: form });
        clearInterval(interval);
        setUploadProgress(100);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Processing failed");
        }

        const data = await res.json();
        setSynthesis(data.synthesized);
        toast.success("Transcript processed", {
          description: `${data.synthesized.totalTurns} Q&A turns extracted and saved.`,
        });
      } catch (err: any) {
        clearInterval(interval);
        toast.error("Processing failed", { description: err.message });
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1500);
      }
    },
    [candidate]
  );

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setSynthesis(null); setUploadProgress(0); onClose(); } }}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl shadow-2xl border border-slate-200">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 px-6 pt-4 pb-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold text-slate-900 leading-snug truncate">
                  {candidate.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400 mt-0.5">
                  Candidate actions — stage management, resume &amp; transcript review.
                </DialogDescription>
              </div>
            </div>
            <Badge className={`shrink-0 font-medium text-[11px] py-0.5 px-2.5 border ${STATUS_COLORS[currentStatus]}`}>
              {currentStatus}
            </Badge>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/20">
          <div className="px-6 py-5 space-y-6">

            {/* ═══ SECTION 1: Stage Management (always first) ══════════════ */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Stage Management
              </h3>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="text-xs text-slate-500 mb-1.5 block font-medium">Move to stage</label>
                  <Select value={currentStatus} onValueChange={(v) => handleStatusChange(v as CandidateStatus)}>
                    <SelectTrigger className="h-9 text-sm border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className={`inline-flex items-center gap-2`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              s === "Applied" ? "bg-slate-400"
                              : s === "Screening" ? "bg-blue-400"
                              : s === "Shortlisted" ? "bg-emerald-400"
                              : s === "Interview Scheduled" ? "bg-violet-400"
                              : "bg-rose-400"
                            }`} />
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick action buttons — gated by stage */}
                <div className="flex items-end gap-2 flex-wrap">
                  {isAdvanced ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-medium">Interview Toolkit</label>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50 h-9"
                            onClick={() => onOpenGuide(candidate)}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Interview Guide
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {isUploading
                              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              : <Upload className="w-3.5 h-3.5 mr-1.5" />
                            }
                            Upload Transcript
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Interview Guide &amp; Transcript upload unlock at <span className="font-semibold text-violet-600 ml-1">Interview Scheduled</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload progress bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing transcript with AI…
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
              />

              {/* Drag-and-drop zone — only shows if advanced */}
              {isAdvanced && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-lg py-3 px-4 cursor-pointer transition-colors text-xs
                    ${isDragOver ? "border-violet-400 bg-violet-50 text-violet-600"
                    : "border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/30"}
                    ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>
                    Drop .pdf, .docx, or .txt transcript here, or click <span className="font-semibold">Upload Transcript</span> above
                  </span>
                </div>
              )}
            </section>

            {/* ═══ SECTION 2: Synthesis Result (if uploaded) ═══════════════ */}
            {synthesis && (
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Transcript Synthesis
                </h3>

                {/* Key Metrics */}
                {synthesis.keyMetrics.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <BarChart3 className="w-3.5 h-3.5" /> Extracted Metrics
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {synthesis.keyMetrics.map((m, i) => (
                        <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signals */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-emerald-100 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Strengths</p>
                    <ul className="space-y-1.5">
                      {synthesis.overallSignals.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-emerald-900 flex gap-1.5">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white border border-rose-100 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Concerns</p>
                    <ul className="space-y-1.5">
                      {synthesis.overallSignals.concerns.map((c, i) => (
                        <li key={i} className="text-xs text-rose-900 flex gap-1.5">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-rose-400" />{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Dialogue Map */}
                {synthesis.dialogueMap.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <MessageSquareText className="w-3.5 h-3.5" />
                      Dialogue Map · {synthesis.totalTurns} turns
                    </div>
                    {synthesis.dialogueMap.map((turn, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        {turn.mainQuestion && (
                          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">Q: {turn.mainQuestion}</p>
                          </div>
                        )}
                        {turn.answerSummary && (
                          <div className="px-4 py-3">
                            <p className="text-xs text-slate-600 leading-relaxed">{turn.answerSummary}</p>
                          </div>
                        )}
                        {turn.followUps?.length > 0 && (
                          <div className="px-4 pb-3 space-y-2">
                            {turn.followUps.map((fu, j) => (
                              <div key={j} className="ml-3 pl-3 border-l-2 border-violet-100">
                                <p className="text-[11px] font-medium text-violet-700">{fu.question}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{fu.response}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ═══ SECTION 3: Resume Profile ════════════════════════════════ */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Resume Profile
              </h3>

              {/* Summary */}
              {candidate.resume_summary && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Quote className="w-3.5 h-3.5" /> Summary
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    &ldquo;{candidate.resume_summary}&rdquo;
                  </p>
                </div>
              )}

              {/* Experience */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5" /> Work Experience
                </div>
                <div className="space-y-5">
                  {candidate.profile_data.experience.map((exp, i) => (
                    <div key={i} className="border-l-2 border-indigo-100 pl-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{exp.role}</h4>
                          <p className="text-xs text-slate-500">{exp.company}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded shrink-0">{exp.duration}</span>
                      </div>
                      <ul className="space-y-1">
                        {exp.achievements.map((ach, j) => (
                          <li key={j} className="text-xs text-slate-600 flex gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{ach}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5" /> Education
                </div>
                <div className="space-y-2">
                  {candidate.profile_data.education.map((edu, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-lg bg-amber-50/30 border border-amber-100/50">
                      <span className="text-sm font-bold text-slate-800">{edu.school}</span>
                      <span className="text-xs text-slate-500">{edu.degree}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Bottom spacing */}
            <div className="h-4" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
