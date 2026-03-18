"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  User, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  FileUp,
  History,
  Info,
  ChevronRight,
  Sparkles,
  Search,
  MessageSquareQuote,
  Star,
  XIcon,
  Download,
  Edit,
  Check,
  Loader2,
  Trash2,
  Plus
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface Question {
  question: string;
  rubricParameter: string;
  lookFor: {
    strong: string;
    poor: string;
  };
}

interface GuideCategory {
  category: string;
  questions: Question[];
}

interface CandidateReviewSheetProps {
  candidate: Candidate | null;
  guideData: { guide: GuideCategory[] } | null;
  isOpen: boolean;
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: (force?: boolean) => void;
  onRefreshReview?: () => void;
  onStatusChange?: (newStatus: "Applied" | "Screening" | "Shortlisted" | "Interview" | "Rejected") => void;
  initialTab?: string;
}

const STAGE_OPTIONS = ["Applied", "Screening", "Shortlisted", "Interview", "Rejected"] as const;

const getStatusBadgeClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case "applied":              return "text-slate-600 border-slate-200 bg-slate-50";
    case "screening":            return "text-blue-600 border-blue-200 bg-blue-50";
    case "shortlisted":          return "text-emerald-600 border-emerald-200 bg-emerald-50";
    case "interview":            return "text-violet-600 border-violet-200 bg-violet-50";
    case "rejected":             return "text-rose-600 border-rose-200 bg-rose-50";
    default:                     return "text-slate-600 border-slate-200 bg-slate-50";
  }
};

const categoryMeta: Record<string, { description: string }> = {
  "Screening":    { description: "Initial screen — assess domain fit, motivation, and communication clarity." },
  "Technical R1": { description: "First technical round — architecture decisions and problem-solving depth." },
  "Technical R2": { description: "Advanced technical round — distributed systems, execution, and trade-offs." },
  "Culture":      { description: "Values and behavioural round — leadership, collaboration, and ownership signals." },
};

const getScoreLabel = (score: number) => {
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Good";
  if (score >= 1.5) return "Borderline";
  return "Poor";
};

const getScoreBadgeClass = (score: number) => {
  if (score >= 3.5) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (score >= 2.5) return "bg-blue-50 text-blue-700 border-blue-100";
  if (score >= 1.5) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
};

const getVerdictBadgeClass = (verdict: string | null) => {
  if (!verdict) return "bg-slate-50 text-slate-500 border-slate-100";
  const v = verdict.toLowerCase().trim();
  if (v.includes("strong hire")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v === "hire") return "bg-green-100 text-green-800 border-green-200";
  if (v.includes("lean hire")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (v.includes("lean no hire")) return "bg-orange-100 text-orange-800 border-orange-200";
  if (v.includes("no hire")) return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
};

export function CandidateReviewSheet({
  candidate,
  guideData,
  isOpen,
  isRefreshing = false,
  onClose,
  onRefresh,
  onRefreshReview,
  onStatusChange,
  initialTab = "analysis",
}: CandidateReviewSheetProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [rounds, setRounds] = useState<any[]>([]);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  // Evaluation Form State
  const [roundType, setRoundType] = useState("Technical Round 1");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showAddRoundForm, setShowAddRoundForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAddRoundForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showAddRoundForm]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen && candidate) {
      fetchRounds();
    }
  }, [isOpen, candidate]);

  const fetchRounds = async () => {
    if (!candidate) return;
    setIsLoadingRounds(true);
    try {
      const res = await fetch(`/api/interview-rounds?candidateId=${candidate.id}`);
      const data = await res.json();
      setRounds(data.rounds || []);
    } catch (err) {
      console.error("Failed to fetch rounds", err);
    } finally {
      setIsLoadingRounds(false);
    }
  };

  const toggleRound = (id: string) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm("Are you sure you want to delete this interview round?")) return;
    try {
      const res = await fetch(`/api/interview-rounds?roundId=${roundId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Round deleted");
      fetchRounds();
      onRefreshReview?.();
    } catch (err) {
      toast.error("Failed to delete round");
    }
  };

  const handleEvaluate = async () => {
    if (!candidate || !transcriptFile) return;

    setIsEvaluating(true);
    const formData = new FormData();
    formData.append("candidateId", candidate.id);
    formData.append("roleId", candidate.roleId);
    formData.append("roundType", roundType);
    formData.append("interviewDate", interviewDate);
    formData.append("transcriptFile", transcriptFile);
    if (feedbackFile) formData.append("notesFile", feedbackFile);

    try {
      const res = await fetch("/api/interview-rounds", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Evaluation failed");
      }

      toast.success("Interview Analysis Completed!");
      setTranscriptFile(null);
      setFeedbackFile(null);
      setShowAddRoundForm(false);
      fetchRounds();
      onRefreshReview?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to evaluate interview");
    } finally {
      setIsEvaluating(false);
    }
  };

  const sortedRounds = [...rounds].sort((a, b) => 
    new Date(b.interview_date || b.created_at).getTime() - 
    new Date(a.interview_date || a.created_at).getTime()
  );

  const avgInterviewScore = rounds.length > 0 
    ? Math.round(rounds.reduce((acc, r) => acc + (r.cumulative_score || 0), 0) / rounds.length)
    : null;

  if (!candidate) return null;

  const categories = guideData?.guide ?? [];
  const review = candidate.resume_review_data;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[92vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-8 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl font-black text-slate-900 leading-none">{candidate.name}</DialogTitle>
                  <Select value={candidate.status as any} onValueChange={(val: any) => onStatusChange?.(val)}>
                    <SelectTrigger className={`h-6 w-fit px-3 text-[9px] font-black uppercase tracking-wider border rounded-full ${getStatusBadgeClass(candidate.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl">
                      {STAGE_OPTIONS.map((stage) => (
                        <SelectItem key={stage} value={stage} className="text-[10px] font-bold">{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogDescription className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest py-0 h-4 border-slate-200">Candidate Pipeline</Badge>
                  • Last Activity {new Date().toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6 pr-6 border-r border-slate-100 hidden sm:flex">
                {candidate.interview_score !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<div className="text-right cursor-help" />}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Interview Flow</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-violet-600 leading-none">{Math.round(candidate.interview_score || 0)}%</span>
                          <Progress value={candidate.interview_score || 0} className="w-16 h-1.5 bg-violet-100" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="w-64 bg-slate-900 border-slate-800 text-white p-3 rounded-xl shadow-2xl">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-1">How is this calculated?</p>
                        <p className="text-[10px] text-slate-200 leading-relaxed space-y-2">
                          <span>The interview score (0–100) is a weighted average of performance across all rounds.</span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Resume Fit</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-indigo-600 leading-none">{Math.round(candidate.resume_score || 0)}%</span>
                    <Progress value={candidate.resume_score || 0} className="w-16 h-1.5" />
                  </div>
                </div>
              </div>

              {activeTab === "guide" && (
                <Button variant="outline" className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl transition-all" onClick={() => onRefresh(true)} disabled={isRefreshing}>
                  <Zap className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-pulse' : 'fill-current'}`} />
                  {isRefreshing ? 'Regenerating...' : 'Regenerate Guide'}
                </Button>
              )}

              <DialogClose render={<Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-50 rounded-xl h-9 w-9 p-0 transition-all hover:rotate-90" />}>
                <XIcon className="w-5 h-5" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-slate-50/10">
          <TabsList className="shrink-0 justify-start h-14 bg-white border-b border-slate-100 px-8 gap-1">
            <TabsTrigger value="analysis" className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400">
              <Zap className="w-3.5 h-3.5 mr-2 fill-current" /> Resume Analyser
            </TabsTrigger>
            <TabsTrigger value="resume" className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400">
              <FileText className="w-3.5 h-3.5 mr-2" /> Full Resume
            </TabsTrigger>
            <TabsTrigger value="guide" className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400">
              <MessageSquareQuote className="w-3.5 h-3.5 mr-2" /> Interview Guide
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400">
              <Sparkles className="w-3.5 h-3.5 mr-2" /> Interview Analysis
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="resume" className="h-full m-0 outline-none overflow-y-auto">
              <div className="max-w-4xl mx-auto px-10 py-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Resume Text</h3>
                   <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-700 h-8 flex items-center gap-2" onClick={() => {
                      const blob = new Blob([candidate.raw_resume_text || ""], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `${candidate.name}_resume.txt`; a.click();
                   }}><Download className="w-3.5 h-3.5" /> Download Text</Button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-12 overflow-hidden relative group">
                   <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                      <FileText className="w-64 h-64 text-slate-900" />
                   </div>
                   <div className="relative z-10 space-y-1">
                     {candidate.raw_resume_text ? (
                       candidate.raw_resume_text.split('\n').map((line, i) => {
                         const trimmed = line.trim();
                         if (!trimmed) return <div key={i} className="h-4" />;
                         
                         // Heuristic for Resume Headers: All caps, short length, or key resume sections
                         const isHeader = /^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|LANGUAGES|SUMMARY|OBJECTIVE|AWARDS|CONTACT|LINKS|STRENGTHS)/i.test(trimmed) || 
                                         (trimmed.length < 50 && trimmed.toUpperCase() === trimmed && trimmed.length > 2);

                         if (isHeader) {
                           return (
                             <h3 key={i} className="text-slate-950 font-black text-xs uppercase tracking-[0.2em] mt-10 mb-6 border-l-4 border-indigo-600 pl-4 bg-slate-50/50 py-2 inline-block pr-8 rounded-r-xl">
                               {trimmed}
                             </h3>
                           );
                         }
                         
                         // Bullet points
                         if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
                           return (
                             <div key={i} className="flex gap-4 mb-3 pl-2 group/res">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0 group-hover/res:bg-indigo-400 transition-colors" />
                               <p className="flex-1 text-[14px] text-slate-600 font-medium leading-relaxed font-sans">
                                 {trimmed.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '')}
                               </p>
                             </div>
                           );
                         }

                         return (
                           <p key={i} className="text-[14px] text-slate-600 font-normal leading-loose mb-3 font-sans">
                             {line}
                           </p>
                         );
                       })
                     ) : (
                       <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                         <FileText className="w-12 h-12 mb-4 opacity-20" />
                         <p className="italic font-medium">No resume text available for analysis.</p>
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="h-full m-0 outline-none overflow-y-auto font-outfit">
              <div className="max-w-5xl mx-auto px-10 py-8 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Executive Summary</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm leading-relaxed text-slate-600 text-[13px]">
                    {review?.resume_summary || review?.summary || review?.hiring_thesis || "No summary available."}
                  </div>
                </section>

                {!review ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <AlertCircle className="w-10 h-10 text-slate-200 mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Analysis Data Not Found</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section>
                      <div className="flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /><h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Standard Fit</h3></div>
                      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden">
                        {(review?.universal_rubric_scores || []).length === 0 ? <div className="px-5 py-8 text-center text-slate-400 italic text-[11px]">No standard scores found.</div> : 
                          review.universal_rubric_scores.map((s: any, i: number) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                              <div className="min-w-0 pr-4"><p className="text-[11px] font-bold text-slate-800 truncate mb-1">{s.rubric || s.parameter}</p><p className="text-[12px] text-slate-500 leading-relaxed font-medium">{s.justification}</p></div>
                              <Badge variant="outline" className={`${getScoreBadgeClass(s.score)} font-black text-[10px] uppercase tracking-widest shrink-0 px-3 py-1 rounded-lg`}>{getScoreLabel(s.score)}</Badge>
                            </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="guide" className="h-full m-0 outline-none flex flex-col">
               {isRefreshing && !guideData ? (
                 <div className="flex-1 flex flex-col items-center justify-center h-[500px] gap-4 bg-white m-8 rounded-3xl border border-slate-100"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /><p className="text-xs font-black text-slate-900 uppercase tracking-widest">Generating interview guide</p></div>
               ) : !["Interview", "Interview Scheduled"].includes(candidate.status) ? (
                 <div className="flex flex-col items-center justify-center py-20 bg-amber-50/30 m-8 rounded-3xl border border-dashed border-amber-200 px-6"><Info className="w-6 h-6 text-amber-600 mb-4" /><h3 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-2">Stage Update Required</h3><p className="text-[11px] text-amber-700/80 text-center max-w-sm leading-relaxed">Please set the candidate stage to <strong>"Interview"</strong> to generate the interview guide.</p></div>
               ) : categories.length > 0 ? (
                 <Tabs defaultValue={categories[0].category} className="flex-1 flex flex-col h-full bg-slate-50/30">
                    <div className="px-10 pt-8 shrink-0"><TabsList className="justify-start h-10 w-fit gap-1 bg-slate-100 p-1 rounded-xl">{categories.map(cat => (<TabsTrigger key={cat.category} value={cat.category} className="px-5 text-[10px] uppercase font-black tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 transition-all">{cat.category}<Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full text-[9px] font-bold">{cat.questions.length}</Badge></TabsTrigger>))}</TabsList></div>
                    <div className="flex-1 overflow-y-auto">{categories.map(cat => (<TabsContent key={cat.category} value={cat.category} className="m-0 p-8 space-y-6"><div className="space-y-4">{cat.questions.map((q, idx) => (<div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"><div className="px-6 py-5 flex items-start gap-4 border-b border-slate-50"><div className="h-6 w-6 rounded-full bg-slate-100 text-[11px] font-black text-slate-500 flex items-center justify-center shrink-0">{idx + 1}</div><p className="text-[14px] font-bold text-slate-800 leading-snug pt-0.5">{q.question}</p></div><div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/30"><div className="p-5"><TrendingUp className="w-3.5 h-3.5 text-emerald-600 mb-2" /><p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.strong}</p></div><div className="p-5"><TrendingDown className="w-3.5 h-3.5 text-rose-500 mb-2" /><p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.poor}</p></div></div></div>))}</div></TabsContent>))}</div>
                 </Tabs>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white m-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden p-12 text-center">
                    <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
                    
                    <div className="relative z-10 max-w-sm space-y-8">
                       <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-6 transform transition-transform hover:rotate-0 duration-500">
                         <MessageSquareQuote className="w-10 h-10 text-white" />
                       </div>
                       
                       <div className="space-y-3">
                         <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Unlock Best-in-Class Interviews</h3>
                         <p className="text-sm text-slate-500 font-medium leading-relaxed">
                          Your candidates deserve high-fidelity assessment. Generate a tailored interview guide to extract consistent, rubric-backed evidence across every round.
                         </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-2" />
                             <p className="text-[10px] font-black uppercase text-slate-800">Standardized</p>
                             <p className="text-[9px] text-slate-400 mt-1">Consistency across interviewers.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                             <Sparkles className="w-4 h-4 text-indigo-500 mb-2" />
                             <p className="text-[10px] font-black uppercase text-slate-800">AI-Powered</p>
                             <p className="text-[9px] text-slate-400 mt-1">Rubric-mapped questions.</p>
                          </div>
                       </div>

                       <Button 
                        onClick={() => onRefresh(true)} 
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95"
                       >
                        <Zap className="w-4 h-4 mr-2 fill-current" />
                        Generate All-Round Guide
                       </Button>
                    </div>
                  </div>
                )}
            </TabsContent>

            <TabsContent value="evaluation" className="h-full m-0 outline-none overflow-y-auto font-outfit">
              <div className="max-w-6xl mx-auto px-10 py-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Interview Rounds</h3><p className="text-[10px] text-slate-400 font-medium mt-0.5">AI evaluation of transcripts.</p></div>
                  <Button onClick={() => setShowAddRoundForm(v => !v)} variant={showAddRoundForm ? "outline" : "default"} className={`h-10 px-5 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all ${showAddRoundForm ? 'border-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'}`}>{showAddRoundForm ? "✕ Cancel" : <><Zap className="w-3.5 h-3.5 fill-current" /> Add interview round</>}</Button>
                </div>

                {showAddRoundForm && (
                  <div ref={formRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section className="bg-white rounded-3xl border border-indigo-100 shadow-[0_20px_50px_rgba(79,70,229,0.08)] p-8 ring-8 ring-indigo-50/30 space-y-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                         <FileUp className="w-32 h-32 text-indigo-600" />
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 ml-1">1. Round Context</label>
                          <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                             <Select value={roundType} onValueChange={(val) => setRoundType(val || "Other")}>
                               <SelectTrigger className="flex-1 h-11 border-none bg-transparent shadow-none text-xs font-bold px-4 focus:ring-0">
                                 <SelectValue placeholder="Round Type" />
                               </SelectTrigger>
                               <SelectContent className="bg-white border-slate-200 shadow-2xl rounded-xl">
                                 <SelectItem value="Screening" className="text-xs font-medium">Screening</SelectItem>
                                 <SelectItem value="Technical Round 1" className="text-xs font-medium">Technical R1</SelectItem>
                                 <SelectItem value="Technical Round 2" className="text-xs font-medium">Technical R2</SelectItem>
                                 <SelectItem value="Culture Fit" className="text-xs font-medium">Culture Fit</SelectItem>
                                 <SelectItem value="Other" className="text-xs font-medium">Other</SelectItem>
                               </SelectContent>
                             </Select>
                             <div className="w-[1px] h-6 self-center bg-slate-200 mx-2" />
                             <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-[140px] h-11 border-none bg-transparent shadow-none text-xs font-bold" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 ml-1">2. Upload Source</label>
                          <div className="grid grid-cols-1 gap-3">
                             {/* Transcript Row */}
                             <div className="relative group/tn">
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger render={
                                     <Label className={`flex items-center gap-4 h-16 px-5 rounded-2xl border border-dashed transition-all cursor-pointer relative overflow-hidden ${transcriptFile ? 'bg-indigo-50/50 border-indigo-500 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-indigo-400 hover:bg-white'}`}>
                                       <input type="file" className="sr-only" onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)} />
                                       <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${transcriptFile ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                         <FileUp className="w-5 h-5" />
                                       </div>
                                       <div className="min-w-0 flex-1">
                                         <p className={`text-[10px] font-black uppercase tracking-widest truncate ${transcriptFile ? 'text-indigo-900' : 'text-slate-500'}`}>
                                           {transcriptFile ? transcriptFile.name : 'Official Transcript'}
                                         </p>
                                         <p className="text-[9px] font-bold text-slate-400/60 uppercase tracking-tighter mt-0.5">Required for AI Audit</p>
                                       </div>
                                       {transcriptFile && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                                     </Label>
                                   } />
                                   <TooltipContent side="top" className="bg-slate-950 text-white text-[10px] px-3 py-2 rounded-lg border-none shadow-xl">Transcript is Mandatory (PDF/DOCX)</TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                               {transcriptFile && (
                                 <button onClick={() => setTranscriptFile(null)} className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-xl z-20"><XIcon className="w-3.5 h-3.5" /></button>
                               )}
                             </div>

                             {/* Notes Row */}
                             <div className="relative group/tn">
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger render={
                                      <Label className={`flex items-center gap-4 h-16 px-5 rounded-2xl border border-dashed transition-all cursor-pointer relative overflow-hidden ${feedbackFile ? 'bg-amber-50/50 border-amber-500 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-amber-400 hover:bg-white'}`}>
                                        <input type="file" className="sr-only" onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)} />
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${feedbackFile ? 'bg-amber-500 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                          <Edit className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className={`text-[10px] font-black uppercase tracking-widest truncate ${feedbackFile ? 'text-amber-900' : 'text-slate-500'}`}>
                                            {feedbackFile ? feedbackFile.name : 'Interviewer Notes'}
                                          </p>
                                          <p className="text-[9px] font-bold text-slate-400/60 uppercase tracking-tighter mt-0.5">Optional High Weight</p>
                                        </div>
                                        {feedbackFile && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                                      </Label>
                                   } />
                                   <TooltipContent side="top" className="w-80 bg-slate-950 text-white text-[10px] p-5 rounded-[2rem] border-none shadow-2xl space-y-4">
                                      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                                        <div className="h-7 w-7 rounded-xl bg-amber-500/20 flex items-center justify-center"><Edit className="w-4 h-4 text-amber-500" /></div>
                                        <div className="flex flex-col">
                                          <p className="font-black text-amber-400 uppercase tracking-widest">Sentiment Precedence</p>
                                          <p className="text-[8px] text-amber-500/60 font-medium font-sans">Human Observation Mode</p>
                                        </div>
                                      </div>
                                      <p className="leading-relaxed text-slate-200 font-medium font-sans italic">
                                        "Human notes carry 70% weight. We prioritize your sentiment over technical parses if they conflict."
                                      </p>
                                   </TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                               {feedbackFile && (
                                 <button onClick={() => setFeedbackFile(null)} className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-xl z-20"><XIcon className="w-3.5 h-3.5" /></button>
                               )}
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-6">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 tracking-widest">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                             READY FOR DEEP ANALYSIS
                           </div>
                        </div>
                        <Button onClick={handleEvaluate} disabled={isEvaluating || !transcriptFile || !roundType.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-12 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                          {isEvaluating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4 mr-2 fill-current" /> Process Round</>}
                        </Button>
                      </div>
                    </section>
                  </div>
                )}

                {/* Interviews so far Section */}
                {rounds.length > 1 && (
                  <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent" />
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="space-y-6 max-w-3xl">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-indigo-600 text-white border-none font-black text-[9px] uppercase tracking-widest px-3 h-5">Interviews so far..</Badge>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{rounds.length} Assessment Rounds completed</span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                          Performance overview for <span className="text-indigo-600">{candidate.name}</span>
                        </h4>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                          {(candidate.profile_data as any)?.interview_summary || "Analyzing interview signals to generate a cumulative narrative..." }
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="relative h-32 w-32 outline outline-offset-4 outline-slate-50 rounded-full">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                            <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={364} strokeDashoffset={364 - (364 * (avgInterviewScore || 0)) / 100} className="text-indigo-600 transition-all duration-1000 ease-out" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{avgInterviewScore}%</span>
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Aggregate</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rounds.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden py-20 px-12 text-center mt-4">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                       <Sparkles className="w-64 h-64 text-indigo-600 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 max-w-2xl space-y-10">
                       <div className="flex items-center justify-center -space-x-4">
                          <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center border-2 border-white shadow-xl">
                            <FileUp className="w-8 h-8 text-indigo-600" />
                          </div>
                          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center border-4 border-white shadow-2xl z-10">
                            <Zap className="w-10 h-10 text-white fill-current" />
                          </div>
                          <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center border-2 border-white shadow-xl">
                            <History className="w-8 h-8 text-violet-600" />
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                         <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Analyze your first interview</h3>
                         <p className="text-sm text-slate-500 font-medium leading-relaxed">
                          Turn raw interview transcripts into evidence-backed hiring signals. Our AI audits the conversation against your role's specific rubrics to provide an objective score and verdict.
                         </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                          <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-3">
                             <div className="h-8 w-8 rounded-xl bg-white shadow-sm flex items-center justify-center">
                               <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                             </div>
                             <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none">How it works</p>
                             <p className="text-[10px] text-slate-500 leading-relaxed">
                               Simply upload the <strong>DOCX/PDF transcript</strong>. The AI identifies technical mastery, cultural alignment, and execution signals while ignoring interviewer bias.
                             </p>
                          </div>
                          <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-3">
                             <div className="h-8 w-8 rounded-xl bg-white shadow-sm flex items-center justify-center">
                               <TrendingUp className="w-4 h-4 text-violet-600" />
                             </div>
                             <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none">Collated Insights</p>
                             <p className="text-[10px] text-slate-500 leading-relaxed">
                               After your first round, we generate a <strong>Portfolio Summary</strong> that synthesizes performance across all interviews into a single cumulative narrative.
                             </p>
                          </div>
                       </div>

                       <div className="pt-4">
                          <Button 
                            onClick={() => setShowAddRoundForm(true)} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Start Your First Round Analysis
                          </Button>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sortedRounds.map((round, idx) => {
                      const isExpanded = expandedRounds.has(round.id) || sortedRounds.length === 1;
                      return (
                        <div key={round.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                          <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleRound(round.id)}>
                            <div className="flex items-center gap-4"><FileText className="w-5 h-5 text-indigo-600" /><div><p className="text-sm font-black text-slate-900">{round.round_type}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(round.interview_date || round.created_at).toLocaleDateString()}</p></div></div>
                            <div className="flex items-center gap-6">
                               <div className="text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verdict</p><Badge className={`${getVerdictBadgeClass(round.verdict)} font-black text-[9px] uppercase tracking-widest px-2 py-0.5`}>{round.verdict || "Evaluating"}</Badge></div>
                               <div className="text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Score</p><span className="text-lg font-black text-emerald-600">{round.cumulative_score ? Math.round(round.cumulative_score) : '—'}</span></div>
                               <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                                 {!isExpanded && (
                                   <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-indigo-100 text-indigo-600 font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); toggleRound(round.id); }}>
                                     Show full analysis
                                   </Button>
                                 )}
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600" onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }}><Trash2 className="w-4 h-4" /></Button>
                                 <XIcon className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                               </div>
                            </div>
                          </div>
                          {isExpanded && round.ai_feedback_json && (
                            <div className="p-8 space-y-8 animate-in fade-in duration-300">
                              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 italic text-sm text-slate-600 leading-relaxed">"{round.ai_feedback_json.hiringThesis || round.ai_feedback_json.summary}"</div>
                              {round.ai_feedback_json.rubricEvaluations && (
                                <div className="grid grid-cols-1 gap-4">
                                  {round.ai_feedback_json.rubricEvaluations.map((evalItem: any, i: number) => (
                                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100"><div className="flex items-center justify-between mb-4"><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{evalItem.parameter}</p><Badge variant="outline" className={`${getScoreBadgeClass(evalItem.score)} font-black text-[10px] border-none`}>{evalItem.score}/4</Badge></div><div className="grid grid-cols-2 gap-8"><div><TrendingUp className="w-3 h-3 text-emerald-500 mb-2" /><p className="text-[12px] text-slate-600 leading-relaxed">{evalItem.aiEvidence}</p></div><div><Sparkles className="w-3 h-3 text-indigo-500 mb-2" /><p className="text-[12px] text-slate-600 leading-relaxed">{evalItem.justification}</p></div></div></div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
