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
  Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onRefresh: (force?: boolean) => void; // For Guide
  onRefreshReview?: () => void; // For Resume Review
  initialTab?: string;
}

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
  initialTab = "analysis",
}: CandidateReviewSheetProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [rounds, setRounds] = useState<any[]>([]);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  
  // Evaluation Form State
  const [roundType, setRoundType] = useState("Technical Round 1");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editingRoundName, setEditingRoundName] = useState("");
  const [showAddRoundForm, setShowAddRoundForm] = useState(false);

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

  const handleRefreshAnalysis = () => {
    toast.info("Refreshing interview analysis...");
    fetchRounds();
  };

  useEffect(() => {
    if (isOpen && activeTab === "guide" && !guideData && !isRefreshing) {
      onRefresh(false); // Initial load: check cache
    }
  }, [isOpen, activeTab, guideData, isRefreshing, onRefresh]);

  const handleEvaluate = async (placeholderOnly = false) => {
    if (!candidate) return;
    if (!placeholderOnly && !transcriptFile) {
      toast.error("Interview transcript (docx, pdf, or txt) is mandatory for AI evaluation");
      return;
    }

    setIsEvaluating(true);
    const formData = new FormData();
    formData.append("candidateId", candidate.id);
    formData.append("roleId", candidate.roleId);
    formData.append("roundType", roundType);
    formData.append("interviewDate", interviewDate);
    if (transcriptFile) formData.append("transcriptFile", transcriptFile);
    if (feedbackFile) formData.append("notesFile", feedbackFile);

    try {
      const res = await fetch("/api/interview-rounds", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Evaluation failed");
      toast.success(placeholderOnly ? "Interview round saved!" : "Interview Analysis Completed!");
      setTranscriptFile(null);
      setFeedbackFile(null);
      setShowAddRoundForm(false);
      fetchRounds();
    } catch (err) {
      toast.error(placeholderOnly ? "Failed to save round" : "Failed to evaluate interview");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRenameRound = async (roundId: string) => {
    if (!editingRoundName.trim()) return;
    try {
      const res = await fetch("/api/interview-rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, newRoundType: editingRoundName }),
      });
      if (!res.ok) throw new Error("Rename failed");
      toast.success("Round renamed");
      setEditingRoundId(null);
      fetchRounds();
    } catch (err) {
      toast.error("Failed to rename round");
    }
  };

  if (!candidate) return null;

  const categories = guideData?.guide ?? [];
  const review = candidate.resume_review_data;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] h-[92vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200"
        showCloseButton={false}
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 px-8 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-black text-slate-900 leading-none">
                  {candidate.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest py-0 h-4 border-slate-200">Candidate Pipeline</Badge>
                  • Last Activity {new Date().toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Resume Fit</p>
                 <div className="flex items-center gap-2">
                   <span className="text-lg font-black text-indigo-600 leading-none">{Math.round(candidate.resume_score || 0)}%</span>
                   <Progress value={candidate.resume_score || 0} className="w-16 h-1.5" />
                 </div>
              </div>
              <Button 
                variant="outline" 
                className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl transition-all"
                onClick={
                  activeTab === "guide" ? () => onRefresh(true) : 
                  activeTab === "evaluation" ? handleRefreshAnalysis :
                  onRefreshReview
                }
                disabled={isRefreshing || isLoadingRounds}
              >
                <Zap className={`w-3 h-3 mr-2 ${(isRefreshing || isLoadingRounds) ? 'animate-pulse' : 'fill-current'}`} />
                {isRefreshing || isLoadingRounds ? 'Refreshing...' : 
                  activeTab === "guide" ? 'Regenerate Guide' : 
                  activeTab === "evaluation" ? 'Refresh interview analysis' :
                  'Regenerate Resume Analysis'}
              </Button>
              <DialogClose render={
                <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-100 rounded-full h-8 w-8 p-0" />
              }>
                <XIcon className="w-5 h-5" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Tabs Navigation ────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-slate-50/10">
          <TabsList className="shrink-0 justify-start h-14 bg-white border-b border-slate-100 px-8 gap-1">
            <TabsTrigger 
              value="analysis" 
              className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400"
            >
              <Zap className="w-3.5 h-3.5 mr-2 fill-current" />
              Resume Analyser
            </TabsTrigger>
            <TabsTrigger 
              value="resume" 
              className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400"
            >
              <FileText className="w-3.5 h-3.5 mr-2" />
              Full Resume
            </TabsTrigger>
            <TabsTrigger 
              value="guide" 
              className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400"
            >
              <MessageSquareQuote className="w-3.5 h-3.5 mr-2" />
              Interview Guide
            </TabsTrigger>
            <TabsTrigger 
              value="evaluation" 
              className="h-14 px-6 text-xs font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all text-slate-400"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Interview Analysis
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            
            {/* ── Resume Tab (Raw Text) ────────────────────────────────── */}
            <TabsContent value="resume" className="h-full m-0 outline-none overflow-y-auto">
              <div className="max-w-4xl mx-auto px-10 py-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Resume Text</h3>
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

            {/* ── Resume Analyser Tab (Analysis) ────────────────────────── */}
            <TabsContent value="analysis" className="h-full m-0 outline-none overflow-y-auto">
              <div className="max-w-5xl mx-auto px-10 py-8 space-y-8">
                
                {/* Summary Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Executive Summary</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm leading-relaxed text-slate-600 text-[13px]">
                    {review?.resume_summary || review?.summary || review?.hiring_thesis || "No summary available. Try regenerating the analysis."}
                  </div>
                </section>

                {/* Score Breakdown */}
                {!review ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <AlertCircle className="w-10 h-10 text-slate-200 mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Analysis Data Not Found</p>
                    <p className="text-[10px] text-slate-400 mt-1 mb-6">This candidate hasn't been analyzed by AI yet.</p>
                    <Button onClick={onRefreshReview} className="bg-indigo-600 hover:bg-indigo-700 h-10 px-8 text-[10px] font-black uppercase tracking-widest">
                       Run AI Analysis
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Universal Rubrics */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Standard Fit</h3>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden">
                        {(review?.universal_rubric_scores || []).length === 0 ? (
                          <div className="px-5 py-8 text-center text-slate-400 italic text-[11px]">No standard scores found.</div>
                        ) : (
                          review.universal_rubric_scores.map((s: any, i: number) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                              <div className="min-w-0 pr-4">
                                <p className="text-[11px] font-bold text-slate-800 truncate mb-1">{s.rubric || s.parameter}</p>
                                <p className="text-[12px] text-slate-500 leading-relaxed font-medium">{s.justification}</p>
                              </div>
                              <Badge variant="outline" className={`${getScoreBadgeClass(s.score)} font-black text-[10px] uppercase tracking-widest shrink-0 px-3 py-1 rounded-lg`}>
                                {getScoreLabel(s.score)}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    {/* Role Specific */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Domain Alignment</h3>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden">
                        {(!review?.role_specific_rubric_scores || review.role_specific_rubric_scores.length === 0) ? (
                          <div className="px-5 py-8 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No domain alignment found.</p>
                          </div>
                        ) : (
                          review.role_specific_rubric_scores.map((s: any, i: number) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                              <div className="min-w-0 pr-4">
                                <p className="text-[11px] font-bold text-slate-800 truncate mb-1">{s.rubric || s.parameter}</p>
                                <p className="text-[12px] text-slate-500 leading-relaxed font-medium">{s.justification}</p>
                              </div>
                              <Badge variant="outline" className={`${getScoreBadgeClass(s.score)} font-black text-[10px] uppercase tracking-widest shrink-0 px-3 py-1 rounded-lg`}>
                                {getScoreLabel(s.score)}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Interview Guide Tab ────────────────────────────────── */}
            <TabsContent value="guide" className="h-full m-0 outline-none flex flex-col">
               {isRefreshing && !guideData ? (
                 <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                   <div className="relative">
                     <Zap className="w-8 h-8 text-indigo-500 animate-pulse fill-indigo-500/20" />
                     <RefreshCw className="w-4 h-4 text-indigo-600 absolute -bottom-1 -right-1 animate-spin" />
                   </div>
                   <p className="text-xs font-black uppercase tracking-widest">Architecting Probes...</p>
                 </div>
               ) : categories.length > 0 ? (
                <Tabs defaultValue={categories[0].category} className="flex-1 flex flex-col h-full bg-slate-50/30">
                    <div className="px-10 pt-8 shrink-0">
                      <TabsList className="justify-start h-10 w-fit gap-1 bg-slate-100 p-1 rounded-xl">
                        {categories.map(cat => (
                          <TabsTrigger 
                            key={cat.category} 
                            value={cat.category}
                            className="px-5 text-[10px] uppercase font-black tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all"
                          >
                            {cat.category}
                            <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full text-[9px] font-bold">
                              {cat.questions.length}
                            </Badge>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      {categories.map(cat => (
                        <TabsContent key={cat.category} value={cat.category} className="m-0 p-8 space-y-6">
                           <div className="flex items-start gap-4 p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                             <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                             <p className="text-xs font-medium text-indigo-900 leading-relaxed">
                               {categoryMeta[cat.category]?.description || "Targeted assessment questions."}
                             </p>
                           </div>

                           <div className="space-y-4">
                             {cat.questions.map((q, idx) => (
                               <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
                                 <div className="px-6 py-5 flex items-start gap-4 border-b border-slate-50">
                                   <div className="h-6 w-6 rounded-full bg-slate-100 text-[11px] font-black text-slate-500 flex items-center justify-center shrink-0">
                                     {idx + 1}
                                   </div>
                                   <p className="text-[14px] font-bold text-slate-800 leading-snug pt-0.5">{q.question}</p>
                                 </div>
                                 <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/30">
                                   <div className="p-5">
                                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Look for</span>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.strong}</p>
                                   </div>
                                   <div className="p-5">
                                      <div className="flex items-center gap-2 text-rose-500 mb-2">
                                        <TrendingDown className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Red Flag</span>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.poor}</p>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </TabsContent>
                      ))}
                    </div>
                 </Tabs>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <History className="w-8 h-8 text-slate-200" />
                    <p className="text-xs font-black uppercase tracking-widest">No guide data generated yet.</p>
                    <Button onClick={() => onRefresh(true)} variant="outline" size="sm" className="h-8 border-slate-200 font-bold uppercase tracking-widest text-[10px]">
                      Generate Interview Guide
                    </Button>
                 </div>
               )}
            </TabsContent>

            {/* ── Interview Analysis Tab ───────────────────────────── */}
            <TabsContent value="evaluation" className="h-full m-0 outline-none overflow-y-auto">
              <div className="max-w-6xl mx-auto px-10 py-10 space-y-8">
                
                {/* ── Header row: title + Add Round button always visible ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Interview Rounds</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Create rounds upfront or upload transcripts to generate AI evaluations.</p>
                  </div>
                  <Button
                    onClick={() => setShowAddRoundForm(v => !v)}
                    variant={showAddRoundForm ? "outline" : "default"}
                    className={`h-10 px-5 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all ${
                      showAddRoundForm
                        ? 'border-slate-200 text-slate-500 hover:text-slate-700'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                    }`}
                  >
                    {showAddRoundForm ? (
                      <>✕ Cancel</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5 fill-current" /> Add interview round</>
                    )}
                  </Button>
                </div>

                {/* ── Collapsible add-round form ── */}
                {showAddRoundForm && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <section className="bg-white rounded-2xl border border-indigo-100 shadow-md p-5 ring-4 ring-indigo-50/40 space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configure Interview Round</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Round Type & Date */}
                        <div className="flex bg-slate-50/80 rounded-xl p-1 gap-1 border border-slate-100 flex-1 min-w-[300px]">
                          <div className="w-1/2">
                            <Input
                              value={roundType}
                              onChange={(e) => setRoundType(e.target.value)}
                              placeholder="Round name (e.g. Technical 1)"
                              className="h-9 border-none bg-transparent shadow-none text-[11px] font-black uppercase tracking-wider focus-visible:ring-0 placeholder:text-slate-400"
                            />
                          </div>
                          <div className="w-[1px] bg-slate-200 my-2" />
                          <div className="w-1/2">
                            <Input
                              type="date"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                              className="h-9 border-none bg-transparent shadow-none text-[11px] font-black uppercase tracking-wider focus-visible:ring-0"
                            />
                          </div>
                        </div>

                        {/* File Uploads */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="file"
                              accept=".docx,.pdf,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-10 px-4 rounded-xl border-dashed font-bold text-[10px] uppercase tracking-widest gap-2 ${
                                transcriptFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500'
                              }`}
                            >
                              {transcriptFile ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileUp className="w-3.5 h-3.5" />}
                              {transcriptFile ? transcriptFile.name.slice(0, 14) + '...' : 'Transcript (optional)'}
                            </Button>
                          </div>

                          <div className="relative">
                            <input
                              type="file"
                              accept=".docx,.pdf,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-10 px-4 rounded-xl border-dashed font-bold text-[10px] uppercase tracking-widest gap-2 ${
                                feedbackFile ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'
                              }`}
                            >
                              {feedbackFile ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                              {feedbackFile ? feedbackFile.name.slice(0, 14) + '...' : 'Notes (optional)'}
                            </Button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {/* Save placeholder (no files needed) */}
                          <Button
                            variant="outline"
                            onClick={() => handleEvaluate(true)}
                            disabled={isEvaluating || !roundType.trim()}
                            className="h-10 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
                          >
                            <Check className="w-3.5 h-3.5" /> Save Round
                          </Button>
                          {/* Evaluate (requires transcript) */}
                          <Button
                            onClick={() => handleEvaluate(false)}
                            disabled={isEvaluating || !transcriptFile || !roundType.trim()}
                            className={`h-10 px-5 font-black text-[10px] uppercase tracking-[0.15em] rounded-xl gap-2 border-none ${
                              !transcriptFile ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                            }`}
                          >
                            {isEvaluating
                              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                              : <><Sparkles className="w-3.5 h-3.5" /> Evaluate</>}
                          </Button>
                        </div>
                      </div>
                      {!transcriptFile && (
                        <p className="text-[10px] text-slate-400 italic">
                          💡 You can save a round without files to pre-schedule it. Upload a transcript later to generate the AI evaluation.
                        </p>
                      )}
                    </section>
                  </div>
                )}

                {/* Latest Analysis Section */}
                {rounds.length > 0 ? (
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Latest Analysis</h3>
                    </div>
                    <div className="space-y-4">
                      {rounds.map((round, idx) => {
                        let feedback = round.ai_feedback_json;
                        // Defensive: handle stringified JSON if queryRaw returns it as a string
                        if (typeof feedback === 'string') {
                          try { feedback = JSON.parse(feedback); } catch(e) { feedback = null; }
                        }
                        return (
                          <div key={idx} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                             <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                   <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                      <FileText className="w-5 h-5" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      {editingRoundId === round.id ? (
                                        <div className="flex items-center gap-2">
                                          <Input 
                                            value={editingRoundName}
                                            onChange={(e) => setEditingRoundName(e.target.value)}
                                            className="h-8 text-sm font-black text-slate-900 border-indigo-200 focus-visible:ring-indigo-500 w-48"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleRenameRound(round.id)}
                                          />
                                          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 px-3 text-[10px] font-black uppercase tracking-widest" onClick={() => handleRenameRound(round.id)}><Check className="w-3 h-3" /></Button>
                                          <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold text-slate-400" onClick={() => setEditingRoundId(null)}>Cancel</Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 group/title">
                                          <p className="text-sm font-black text-slate-900 truncate">{round.round_type}</p>
                                          <button 
                                            onClick={() => { setEditingRoundId(round.id); setEditingRoundName(round.round_type); }}
                                            className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-slate-100 rounded transition-all text-slate-400"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{new Date(round.interview_date || round.created_at).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="text-right">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verdict</p>
                                      {round.ai_feedback_json ? (
                                        <Badge variant="outline" className={`${getVerdictBadgeClass(round.verdict)} font-black text-[9px] uppercase tracking-widest px-2 py-0.5 h-auto border-none`}>
                                          {round.verdict || "Evaluating"}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 h-auto border-none">
                                          Pending
                                        </Badge>
                                      )}
                                   </div>
                                   <div className="text-right min-w-[60px]">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Score</p>
                                      {round.cumulative_score != null ? (
                                        <span className="text-lg font-black text-emerald-600">{Math.round(round.cumulative_score)}/100</span>
                                      ) : (
                                        <span className="text-sm font-black text-slate-300">—</span>
                                      )}
                                   </div>
                                </div>
                             </div>
                             
                             {feedback ? (
                               <div className="flex flex-col">
                                 <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/20">
                                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                      "{feedback.hiringThesis || feedback.summary || "No hiring thesis generated."}"
                                    </p>
                                 </div>
                                 <div className="px-8 py-6 bg-slate-50/20 grid grid-cols-2 gap-8 border-b border-slate-50">
                                    <div>
                                       <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
                                          <TrendingUp className="w-3 h-3" /> Strengths
                                       </h4>
                                       <ul className="space-y-2">
                                          {(feedback.strengths || []).slice(0, 3).map((s: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2 font-medium">
                                               <div className="h-1 p-0.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                                               {s}
                                            </li>
                                          ))}
                                          {(!feedback.strengths || feedback.strengths.length === 0) && (
                                            <li className="text-xs text-slate-400 italic">No specific strengths captured.</li>
                                          )}
                                       </ul>
                                    </div>
                                    <div>
                                       <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-1.5">
                                          <TrendingDown className="w-3 h-3" /> Areas for Review
                                       </h4>
                                       <ul className="space-y-2">
                                          {(feedback.weaknesses || []).slice(0, 3).map((w: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2 font-medium">
                                               <div className="h-1 p-0.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                                               {w}
                                            </li>
                                          ))}
                                          {(!feedback.weaknesses || feedback.weaknesses.length === 0) && (
                                            <li className="text-xs text-slate-400 italic">No critical areas for review captured.</li>
                                          )}
                                       </ul>
                                    </div>
                                 </div>

                                 {/* Rubric Evaluations */}
                                 {feedback.rubricEvaluations && feedback.rubricEvaluations.length > 0 && (
                                   <div className="px-8 py-6 space-y-3">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Competency Assessment</h4>
                                      <div className="grid grid-cols-1 gap-4">
                                        {feedback.rubricEvaluations.map((evalItem: any, idx: number) => (
                                          <div key={idx} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                                            {/* Rubric header */}
                                            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
                                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{evalItem.parameter}</p>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`h-5 text-[9px] font-bold uppercase tracking-widest px-2 border-none ${
                                                  evalItem.grade === 'Strong' ? 'bg-emerald-50 text-emerald-600' :
                                                  evalItem.grade === 'Good' ? 'bg-blue-50 text-blue-600' :
                                                  evalItem.grade === 'Borderline' ? 'bg-amber-50 text-amber-600' :
                                                  'bg-rose-50 text-rose-600'
                                                }`}>
                                                  {evalItem.grade}
                                                </Badge>
                                                <span className="text-xs font-black text-slate-900">{evalItem.score}/4</span>
                                              </div>
                                            </div>
                                            {/* Two-column body */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-50">
                                              <div className="p-4 space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Evidence from Transcript</p>
                                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                                  {evalItem.aiEvidence || "No specific evidence captured from transcript."}
                                                </p>
                                              </div>
                                              <div className="p-4 space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Score Rationale</p>
                                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                                  {evalItem.justification || "No detailed score rationale provided."}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                 )}
                               </div>
                              ) : (
                                /* Placeholder round - no transcript yet */
                                <div className="px-8 py-8 flex flex-col items-center justify-center gap-3 bg-amber-50/30 border-t border-amber-100/60">
                                  <FileUp className="w-6 h-6 text-amber-400" />
                                  <div className="text-center space-y-1">
                                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Awaiting Transcript</p>
                                    <p className="text-[11px] text-amber-600/80 leading-relaxed max-w-sm">
                                      This round is pre-scheduled. Click <strong>Add interview round</strong> above, upload the transcript, then hit <strong>Evaluate</strong>.
                                    </p>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  /* ── First-time empty state: onboarding flow guide ── */
                  <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 space-y-8">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">How Interview Analysis Works</h3>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">Follow these 3 steps to generate an AI-powered, rubric-based interview evaluation for this candidate.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm">1</div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Create a Round</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Click <strong>Add interview round</strong> above. Enter the round name (e.g. Technical 1, Culture Fit) and a scheduled date. You can save it without any files to pre-schedule the slot.</p>
                      </div>
                      <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-amber-50/50 border border-amber-100">
                        <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm">2</div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Upload Transcript</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">After the interview, upload the meeting transcript (PDF, DOCX, or TXT). You can also attach optional interviewer notes for additional context.</p>
                      </div>
                      <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                        <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">3</div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Review AI Analysis</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">The AI evaluates each competency rubric with evidence from the transcript — giving you a score, verdict, strengths, gaps, and a detailed rationale per parameter.</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => setShowAddRoundForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 text-[11px] font-black uppercase tracking-widest gap-2 rounded-xl shadow-lg shadow-indigo-100"
                      >
                        <Zap className="w-4 h-4 fill-current" /> Add your first round
                      </Button>
                    </div>
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
