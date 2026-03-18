"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Quote,
  Briefcase,
  Upload,
  FileText,
  Loader2,
  BarChart3,
  MessageSquareText,
} from "lucide-react";
import { toast } from "sonner";

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
  "Interview Scheduled",
  "Rejected",
];

const STATUS_COLORS: Record<CandidateStatus, string> = {
  Applied:              "bg-slate-100 text-slate-700",
  Screening:            "bg-blue-100 text-blue-700",
  Shortlisted:          "bg-emerald-100 text-emerald-700",
  Interview:            "bg-violet-100 text-violet-700",
  "Interview Scheduled": "bg-indigo-100 text-indigo-700",
  Rejected:             "bg-rose-100 text-rose-700",
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

interface AIEvaluationSheetProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: CandidateStatus) => void;
}

export function AIEvaluationSheet({
  candidate,
  isOpen,
  onClose,
  onStatusChange,
}: AIEvaluationSheetProps) {
  const [status, setStatus] = useState<CandidateStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync status from prop when candidate changes
  const currentStatus = status ?? (candidate?.status as CandidateStatus);

  // ── Status update ──────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: CandidateStatus) => {
    if (!candidate) return;
    const prevStatus = currentStatus;
    setStatus(newStatus); // optimistic

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      onStatusChange?.(candidate.id, newStatus);
      toast.success("Status updated", {
        description: `${candidate.name} → ${newStatus}`,
      });
    } catch {
      setStatus(prevStatus); // rollback
      toast.error("Could not update status. Please try again.");
    }
  };

  // ── File upload ────────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      if (!candidate) return;
      const allowed = [".pdf", ".docx", ".txt"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error("Unsupported file type", {
          description: "Please upload a .pdf, .docx, or .txt file.",
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      setSynthesis(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("candidateId", candidate.id);

        // Fake progress while waiting
        const interval = setInterval(() => {
          setUploadProgress((p) => Math.min(p + 8, 85));
        }, 600);

        const res = await fetch("/api/process-transcript", {
          method: "POST",
          body: formData,
        });

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
        toast.error("Transcript processing failed", {
          description: err.message,
        });
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1500);
      }
    },
    [candidate]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  if (!candidate) return null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setStatus(null);
          setSynthesis(null);
          setUploadProgress(0);
          onClose();
        }
      }}
    >
      {/* ── Expanded to max-w-2xl (≈700px) ──────────────────── */}
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white shrink-0">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                AI Powered
              </Badge>
              {candidate.resume_score !== null && (
                <Badge variant="outline" className="font-bold text-xs">
                  {candidate.resume_score}% Match
                </Badge>
              )}
            </div>
            <SheetTitle className="text-xl font-bold text-slate-900">
              {candidate.name}
            </SheetTitle>
            <SheetDescription className="text-slate-500 text-sm">
              Full candidate profile, stage management &amp; transcript analysis.
            </SheetDescription>
          </SheetHeader>

          {/* Stage selector */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stage
            </span>
            <Select value={currentStatus} onValueChange={(v) => handleStatusChange(v as CandidateStatus)}>
              <SelectTrigger className="w-52 h-8 text-sm font-medium border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className={`inline-block mr-2 w-2 h-2 rounded-full ${STATUS_COLORS[s].split(" ")[0]}`} />
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-8">

            {/* ── Resume Summary ─────────────────────────────── */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Quote className="w-4 h-4" /> Resume Summary
              </h3>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-sm">
                &ldquo;{candidate.resume_summary || "No summary available."}&rdquo;
              </p>
            </section>

            <Separator className="bg-slate-100" />

            {/* ── Work Experience ────────────────────────────── */}
            <section>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Work Experience
              </h3>
              <div className="space-y-5">
                {candidate.profile_data.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{exp.role}</h4>
                        <p className="text-xs text-slate-600">{exp.company}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded shrink-0">
                        {exp.duration}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {exp.achievements.map((ach, j) => (
                        <li key={j} className="text-xs text-slate-600 flex gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          {ach}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Education ─────────────────────────────────── */}
            <section>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Education
              </h3>
              <div className="space-y-2">
                {candidate.profile_data.education.map((edu, i) => (
                  <div
                    key={i}
                    className="flex flex-col p-3 rounded-lg bg-amber-50/30 border border-amber-100/50"
                  >
                    <span className="font-bold text-slate-800 text-sm">{edu.school}</span>
                    <span className="text-xs text-slate-600">{edu.degree}</span>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* ── Transcript Upload Zone ─────────────────────── */}
            <section>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Upload Interview Transcript
              </h3>

              {/* Progress bar */}
              {isUploading && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing transcript…
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* Upload zone */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-2 
                  border-2 border-dashed rounded-xl p-6 cursor-pointer
                  transition-all duration-200
                  ${isUploading 
                    ? "opacity-60 pointer-events-none" 
                    : "border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="w-6 h-6 text-slate-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Select transcript to upload
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supports .pdf, .docx, .txt
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50 mt-1"
                  disabled={isUploading}
                >
                  Browse file
                </Button>
              </div>

              {/* Synthesis Result */}
              {synthesis && (
                <div className="mt-5 space-y-5">
                  {/* Key Metrics */}
                  {synthesis.keyMetrics.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" /> Extracted Metrics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {synthesis.keyMetrics.map((m, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Signals */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {synthesis.overallSignals.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-emerald-900 flex gap-1.5">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        Concerns
                      </h4>
                      <ul className="space-y-1.5">
                        {synthesis.overallSignals.concerns.map((c, i) => (
                          <li key={i} className="text-xs text-rose-900 flex gap-1.5">
                            <span className="w-3 h-3 mt-0.5 shrink-0 text-rose-400 font-black">!</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Dialogue Map */}
                  {synthesis.dialogueMap.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquareText className="w-3 h-3" /> Dialogue Map ({synthesis.totalTurns} turns)
                      </h4>
                      {synthesis.dialogueMap.map((turn, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                        >
                          {turn.mainQuestion && (
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                Q: {turn.mainQuestion}
                              </p>
                            </div>
                          )}
                          {turn.answerSummary && (
                            <div className="px-4 py-3">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {turn.answerSummary}
                              </p>
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
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
