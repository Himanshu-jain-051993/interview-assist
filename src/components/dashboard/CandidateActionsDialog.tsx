
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Candidate, CandidateStatus } from "@/lib/types";
import {
  Plus,
  Loader2,
  Clock,
  Gauge,
  FileText,
  Zap,
  Calendar,
  User,
  MoreVertical,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
  "Interview Scheduled",
  "Rejected",
];

const STAGE_COLORS: Record<CandidateStatus, string> = {
  Applied: "bg-slate-100 text-slate-700",
  Screening: "bg-blue-100 text-blue-700",
  Shortlisted: "bg-emerald-100 text-emerald-700",
  Interview: "bg-violet-100 text-violet-700",
  "Interview Scheduled": "bg-indigo-100 text-indigo-700",
  Rejected: "bg-rose-100 text-rose-700",
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
  interview_date: string | null;
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
  onCandidateUpdate: (c: Candidate) => void;
  onOpenGuide: (c: Candidate) => void;
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function ScoreGauge({ value, label }: { value: number; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 10) * circ;
  const color = value >= 8 ? "#10b981" : value >= 6 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="60" height="60" viewBox="0 0 72 72">
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
        />
        <text x="36" y="42" textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>
          {Math.round(value)}
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
    </div>
  );
}

function ScheduleRoundForm({
  candidateId,
  roleId,
  onSuccess,
}: {
  candidateId: string;
  roleId: string;
  onSuccess: (round: InterviewRound) => void;
}) {
  const [roundType, setRoundType] = useState("Screening");
  const [interviewDate, setInterviewDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("candidateId", candidateId);
    formData.append("roleId", roleId);
    formData.append("roundType", roundType);
    if (interviewDate) formData.append("interviewDate", interviewDate);

    try {
      const res = await fetch("/api/interview-rounds", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule interview");
      toast.success("Interview scheduled successfully");
      onSuccess(data.round);
      setInterviewDate("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Schedule New Interview</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Round Type</label>
          <Select value={roundType} onValueChange={(v: any) => v && setRoundType(v)}>
            <SelectTrigger className="h-10 text-xs font-bold bg-slate-50 border-slate-200 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {Object.keys(ROUND_LABEL).map((k) => (
                <SelectItem key={k} value={k} className="text-xs font-semibold">{ROUND_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Interview Date</label>
          <Input
            type="date"
            className="h-10 text-xs font-bold bg-slate-50 border-slate-200"
            value={interviewDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterviewDate(e.target.value)}
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white font-black h-11 uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-md"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Interview"}
      </Button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CandidateActionsDialog({
  candidate: initialCandidate,
  currentStatus,
  isOpen,
  onClose,
  onStatusChange,
  onCandidateUpdate,
  onOpenGuide,
}: CandidateActionsDialogProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(initialCandidate);
  const [status, setStatus] = useState<CandidateStatus>(currentStatus);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [guideData, setGuideData] = useState<any>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [isRefreshingGuide, setIsRefreshingGuide] = useState(false);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
  const [analyzingRoundId, setAnalyzingRoundId] = useState<string | null>(null);

  useEffect(() => { 
    setCandidate(initialCandidate);
    setStatus(currentStatus); 
  }, [initialCandidate, currentStatus]);

  const fetchRounds = async () => {
    if (!candidate) return;
    setIsLoadingRounds(true);
    try {
      const res = await fetch(`/api/interview-rounds?candidateId=${candidate.id}`);
      const data = await res.json();
      setRounds(data.rounds ?? []);
    } catch (err) {
      console.error("[ActionsDialog] Rounds fetch error:", err);
    } finally {
      setIsLoadingRounds(false);
    }
  };

  const fetchGuide = async (refresh = false) => {
    if (!candidate) return;
    if (refresh) setIsRefreshingGuide(true);
    else setIsLoadingGuide(true);
    
    try {
      const res = await fetch("/api/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, roleId: candidate.roleId, force: refresh }),
      });
      const data = await res.json();
      setGuideData(data);
    } catch (err) {
      console.error("[ActionsDialog] Guide fetch error:", err);
    } finally {
      setIsLoadingGuide(false);
      setIsRefreshingGuide(false);
    }
  };

  const handleRefreshResumeAnalyzer = async () => {
    if (!candidate) return;
    setIsAnalyzingResume(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      toast.success("Resume analyzer refreshed successfully");
      setCandidate(data.candidate);
      onCandidateUpdate(data.candidate);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAnalyzingResume(false);
    }
  };

  useEffect(() => {
    if (isOpen && candidate) {
      fetchRounds();
      fetchGuide();
    }
  }, [isOpen, candidate?.id]);

  const handleStatusChange = async (newStatus: CandidateStatus) => {
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
      toast.success(`Candidate moved to ${newStatus}`);
    } catch {
      setStatus(prev);
      toast.error("Failed to update status");
    }
  };

  const handleGenerateInterviewAnalysis = async (roundId: string) => {
    const transcriptInput = document.createElement("input");
    transcriptInput.type = "file";
    transcriptInput.accept = ".pdf,.docx,.txt";
    
    transcriptInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setAnalyzingRoundId(roundId);
      const formData = new FormData();
      formData.append("transcriptFile", file);

      try {
        const res = await fetch(`/api/interview-rounds/${roundId}`, {
          method: "PATCH",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        
        toast.success("Interview analysis generated successfully");
        setRounds(prev => prev.map(r => r.id === roundId ? data.round : r));
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setAnalyzingRoundId(null);
      }
    };
    transcriptInput.click();
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-3xl">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                  {candidate.name}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge className={`font-bold text-[10px] uppercase tracking-wider py-1 px-3 ${STAGE_COLORS[status] || "bg-slate-100"}`}>
                    {status}
                  </Badge>
                  {candidate.resume_score !== null && (
                    <Badge variant="outline" className="text-[10px] border-slate-200 font-black text-indigo-600 bg-indigo-50/30 px-3">
                      {Math.round(candidate.resume_score)}% AI Match
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Status</span>
                <Select value={status} onValueChange={(v: any) => v && handleStatusChange(v)}>
                  <SelectTrigger className="h-10 text-xs border-slate-200 w-48 font-bold bg-slate-50 hover:bg-white transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {STAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs font-semibold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="resume" className="h-full flex flex-col">
              <TabsList className="shrink-0 flex justify-start gap-8 bg-white px-8 h-12 border-b border-slate-100">
                <TabsTrigger value="resume" className="text-xs font-bold uppercase tracking-widest h-full px-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 rounded-none shadow-none">Resume</TabsTrigger>
                <TabsTrigger value="evaluation" className="text-xs font-bold uppercase tracking-widest h-full px-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 rounded-none shadow-none text-nowrap">Resume Analyzer</TabsTrigger>
                <TabsTrigger value="guide" className="text-xs font-bold uppercase tracking-widest h-full px-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 rounded-none shadow-none text-nowrap">Interview Guide</TabsTrigger>
                <TabsTrigger value="interviews" className="text-xs font-bold uppercase tracking-widest h-full px-0 border-b-2 border-transparent data-[state=active]:border-indigo-600 rounded-none shadow-none text-nowrap">Interview scheduling and feedback</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto bg-slate-50/40">
                <TabsContent value="resume" className="p-8 m-0 outline-none">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Resume Text</h3>
                       <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-700 h-8 flex items-center gap-2" onClick={() => {
                          const blob = new Blob([candidate.raw_resume_text || ""], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${candidate.name}_resume.txt`;
                          a.click();
                       }}>
                          <Download className="w-3.5 h-3.5" />
                          Download Text
                       </Button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
                      {candidate.raw_resume_text || "No text available for analysis."}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evaluation" className="p-8 m-0 outline-none">
                  <div className="max-w-3xl mx-auto space-y-8">
                    <div className="flex justify-end">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="text-[10px] font-black uppercase tracking-[0.1em] h-10 px-6 bg-white shadow-sm border-slate-200 hover:bg-slate-50"
                         onClick={handleRefreshResumeAnalyzer}
                         disabled={isAnalyzingResume}
                        >
                          {isAnalyzingResume ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2 text-indigo-500" />}
                          Refresh Resume Analyzer
                       </Button>
                    </div>

                    {!candidate.resume_review_data ? (
                       <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4"><Gauge className="w-12 h-12 opacity-20" /><p className="text-sm font-bold uppercase tracking-widest opacity-50">Analysis Pending</p></div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="md:col-span-2 bg-indigo-600 rounded-2xl p-7 text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Strategic Hiring Thesis</span>
                              <p className="mt-4 text-[13.5px] font-medium leading-relaxed italic pr-4">
                                "{candidate.resume_review_data.hiring_thesis || candidate.resume_review_data.resume_summary}"
                              </p>
                              <div className="mt-8 flex items-center gap-4">
                                <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                                   <div className="h-full bg-white" style={{ width: `${candidate.resume_score}%` }} />
                                </div>
                                <span className="text-2xl font-black">{Math.round(candidate.resume_score || 0)}%</span>
                              </div>
                           </div>
                           <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                              <ScoreGauge value={(candidate.resume_score || 0) / 10} label="Resume Match" />
                           </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Detailed Rubric Scores</h4>
                            <div className="h-px w-full bg-slate-100" />
                          </div>
                          <div className="grid gap-3">
                            {[
                              ...(candidate.resume_review_data.universal_rubric_scores || []),
                              ...(candidate.resume_review_data.role_specific_rubric_scores || [])
                            ].map((r: any, i: number) => (
                              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4 transition-all hover:border-indigo-200 group">
                                <div className={`shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center border ${r.score >= 3 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
                                  <span className="text-xs font-black">{r.score}</span>
                                  <span className="text-[8px] font-bold uppercase opacity-60">/4</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{r.rubric || r.parameter || "Skill Metric"}</p>
                                  <p className="text-[12px] text-slate-500 leading-snug">{r.justification || r.explanation || "No explanation provided."}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="guide" className="p-8 m-0 outline-none">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                       <div className="space-y-1">
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Precision Interview Questions</h3>
                         <p className="text-[11px] text-slate-500">Targeted probes for {candidate.name}'s profile.</p>
                       </div>
                       <Button 
                         variant="outline" 
                         className="h-10 text-[10px] font-black uppercase tracking-widest px-6 border-slate-200 hover:bg-slate-50 shadow-sm bg-white"
                         onClick={() => fetchGuide(true)}
                         disabled={isRefreshingGuide}
                       >
                         {isRefreshingGuide ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2 text-indigo-500" />}
                         Regenerate Interview Guide
                       </Button>
                    </div>

                    {isLoadingGuide ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synthesizing personalized guide...</p></div>
                    ) : !guideData?.guide ? (
                      <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white"><Zap className="w-12 h-12 mx-auto text-slate-200 mb-6" /><Button onClick={() => fetchGuide()} size="sm" className="bg-slate-900 text-white font-black px-8 h-11 uppercase text-[10px] tracking-widest">Generate Interview Guide</Button></div>
                    ) : (
                      <div className="space-y-10">
                        {guideData.guide.map((cat: any, i: number) => (
                          <div key={i} className="space-y-5">
                            <div className="flex items-center gap-4">
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{cat.category} Round</h3>
                              <div className="h-px flex-1 bg-slate-200" />
                            </div>
                            <div className="grid gap-4">
                              {cat.questions?.map((q: any, j: number) => (
                                <div key={j} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                  <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 font-semibold text-[13px] text-slate-800 tracking-tight uppercase">{q.question}</div>
                                  <div className="grid grid-cols-2 divide-x divide-slate-100 p-6 gap-6">
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Strong Signal</p>
                                      <p className="text-xs text-slate-600 leading-relaxed font-medium bg-emerald-50/20 p-3 rounded-xl border border-emerald-50">{q.lookFor?.strong || q.sampleAnswer}</p>
                                    </div>
                                    <div className="pl-6 space-y-2">
                                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Red Flag</p>
                                      <p className="text-xs text-slate-600 leading-relaxed font-medium bg-rose-50/20 p-3 rounded-xl border border-rose-50">{q.lookFor?.poor || "Vague or non-committal response."}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="interviews" className="p-8 m-0 outline-none">
                  <div className="max-w-3xl mx-auto space-y-10">
                    <ScheduleRoundForm 
                        candidateId={candidate.id} 
                        roleId={candidate.roleId} 
                        onSuccess={(round) => { setRounds(prev => [...prev, round]); }} 
                    />

                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Interview Rounds History</h4>
                        <div className="h-px w-full bg-slate-100" />
                      </div>

                      {isLoadingRounds ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                      ) : rounds.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                          <Clock className="w-10 h-10 mx-auto text-slate-100 mb-3" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No rounds scheduled.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {rounds.map((r: any) => (
                            <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-indigo-200/50 transition-all">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ROUND_COLOR[r.round_type] || "bg-slate-100 text-slate-400"}`}>
                                <User className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{ROUND_LABEL[r.round_type] || r.round_type}</h4>
                                  <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">{new Date(r.interview_date || r.created_at).toLocaleDateString()}</Badge>
                                </div>
                                <p className="text-xs text-slate-500 truncate italic">
                                  {r.ai_feedback_json?.overallFeedback || (r.transcript_text ? "Analysis in progress..." : "Awaiting interview data...")}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                {r.cumulative_score !== null ? (
                                  <div className="text-right">
                                    <div className="text-lg font-black text-indigo-600 leading-none">{Math.round(r.cumulative_score)}%</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Match</div>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-indigo-600 text-white border-transparent font-black text-[10px] uppercase tracking-widest h-10 px-6 hover:bg-slate-900 transition-all shadow-md active:scale-95"
                                    onClick={() => handleGenerateInterviewAnalysis(r.id)}
                                    disabled={analyzingRoundId === r.id}
                                  >
                                    {analyzingRoundId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
                                    Generate Interview Analysis
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="text-slate-300"><MoreVertical className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
