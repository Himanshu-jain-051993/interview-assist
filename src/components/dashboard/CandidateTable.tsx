import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Candidate, CandidateStatus } from "@/lib/types";
import { 
  Settings2, 
  User, 
  ChevronRight, 
  Loader2, 
  FileText, 
  Trash2, 
  Zap, 
  Info,
  ExternalLink,
  MessageSquareQuote
} from "lucide-react";
import { useState } from "react";
import { CandidateActionsDialog } from "./CandidateActionsDialog";
import { CandidateReviewSheet } from "./CandidateReviewSheet";
import { toast } from "sonner";

interface CandidateTableProps {
  candidates: Candidate[];
  onDeleted?: (silent?: boolean) => void;
}

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
  "Rejected",
];

// Stages at/above Interview — unlock cockpit
const ADVANCED_STAGES: CandidateStatus[] = ["Interview"];

const getScoreLabel = (score: number) => {
  if (score >= 90) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 55) return "Borderline";
  return "Poor";
};

export function CandidateTable({ candidates, onDeleted }: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [reviewCandidate, setReviewCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<string>("resume");
  const [guideData, setGuideData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingReview, setIsRefreshingReview] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Track status changes so the table badge updates without a page reload
  const [localStatuses, setLocalStatuses] = useState<Record<string, CandidateStatus>>({});

  const getDisplayStatus = (c: Candidate): CandidateStatus =>
    localStatuses[c.id] ?? (c.stage as CandidateStatus);

  const handleStatusChange = async (id: string, newStatus: CandidateStatus) => {
    setIsUpdatingStatus(id);
    const prevStatus = localStatuses[id] || candidates.find(c => c.id === id)?.stage;
    
    // Optimistic update
    setLocalStatuses((prev) => ({ ...prev, [id]: newStatus }));
    
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Stage updated: ${newStatus}`);
      
      // Sync with review sheet if it's open for this candidate
      if (reviewCandidate?.id === id) {
        setReviewCandidate(prev => prev ? { ...prev, stage: newStatus } : null);
      }
    } catch (err) {
      toast.error("Failed to update stage");
      // Rollback
      if (prevStatus) setLocalStatuses((prev) => ({ ...prev, [id]: prevStatus as CandidateStatus }));
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getStatusBadgeClass = (status: string | undefined | null) => {
    if (!status) return "text-slate-600 border-slate-200 bg-slate-50";
    switch (status.toLowerCase()) {
      case "applied":              return "text-slate-600 border-slate-200 bg-slate-50";
      case "screening":            return "text-blue-600 border-blue-200 bg-blue-50";
      case "shortlisted":          return "text-emerald-600 border-emerald-200 bg-emerald-50";
      case "interview":            return "text-violet-600 border-violet-200 bg-violet-50";
      case "rejected":             return "text-rose-600 border-rose-200 bg-rose-50";
      default:                     return "text-slate-600 border-slate-200 bg-slate-50";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const openReviewSheet = async (candidate: Candidate, tab: string) => {
    setActiveTab(tab);
    setReviewCandidate(candidate);
    
    // Clear previous guide data when switching candidates
    setGuideData(null);
    
    // Silently check if there's a cached guide available without forcing generation
    try {
      const res = await fetch(`/api/generate-guide?candidateId=${candidate.id}&roleId=${candidate.roleId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.guide || Array.isArray(data.guide))) {
          setGuideData(data);
        } else if (Array.isArray(data)) {
          setGuideData({ guide: data });
        }
      }
    } catch (e) {
      // Ignore initial load errors (it just means it needs generation)
    }
  };

  const handleGenerateGuide = async (candidate: Candidate, force = false) => {
    // If not forcing and we already have data for this candidate, don't re-fetch
    if (!force && guideData && reviewCandidate?.id === candidate.id) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, roleId: candidate.roleId, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to generate guide");
      }

      if (data && (data.guide || Array.isArray(data.guide))) {
        setGuideData(data);
      } else {
        console.error("Unexpected guide data structure:", data);
        // Fallback for direct array or other structures
        if (Array.isArray(data)) {
          setGuideData({ guide: data });
        } else {
          throw new Error("Invalid guide format received from server");
        }
      }
    } catch (err) {
      console.error("Error generating guide:", err);
      toast.error("Failed to generate interview guide. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshReview = async () => {
    if (!reviewCandidate) return;
    setIsRefreshingReview(true);
    try {
      const res = await fetch(`/api/candidates/${reviewCandidate.id}/refresh-score`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Refresh failed");
      }
      toast.success("Resume analysis regenerated!");
      if (data.candidate) {
        setReviewCandidate(data.candidate);
      } else if (data.reviewData) {
        setReviewCandidate(prev => prev ? { 
          ...prev, 
          resume_score: data.score, 
          resume_review_data: data.reviewData 
        } : null);
      }
      onDeleted?.(true); // Silent refresh to avoid closing sheet
    } catch (err) {
      toast.error("Failed to regenerate analysis");
    } finally {
      setIsRefreshingReview(false);
    }
  };

  const handleCandidateUpdate = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.candidate) {
          setReviewCandidate(data.candidate);
          onDeleted?.(true); // triggers list refresh smoothly
        }
      }
    } catch (e) {
      console.error("Failed silent candidate update", e);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    console.log("[Delete] Triggered for:", candidateId);
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    setIsDeleting(candidateId);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Candidate deleted");
      onDeleted?.();
    } catch (err) {
      console.error("[Delete] Error:", err);
      toast.error("Failed to delete candidate");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="w-[200px] font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 pl-6">Candidate Name</TableHead>
            <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4">Stage</TableHead>
            <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 text-center">
              Resume Fit
            </TableHead>
            <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center justify-center gap-1 cursor-help">
                      Interview <Info className="w-3 h-3 text-slate-300" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="w-72 bg-slate-900 border-slate-800 text-white p-4 rounded-xl shadow-2xl">
                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Interview Breakdown</p>
                    <p className="text-[10px] text-slate-200 leading-relaxed font-medium">
                      Combined score from AI interview analysis across all rounds. 
                      <br /><br />
                      To generate this score:
                      <br />
                      1. Open <strong>Interview Cockpit</strong>
                      <br />
                      2. Go to <strong>Interview Analysis</strong> tab
                      <br />
                      3. Upload a transcript or feedback
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-right font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 pr-6 w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates
            .sort((a, b) => (b.resume_score || 0) - (a.resume_score || 0))
            .map((candidate) => {
            const displayStatus = getDisplayStatus(candidate);
            const isAdvanced = ADVANCED_STAGES.includes(displayStatus);

            return (
              <TableRow key={candidate.id} className="hover:bg-slate-50/50 transition-colors group border-slate-100">
                {/* Name */}
                <TableCell className="font-bold text-slate-900 pl-6">
                  <div className="flex flex-col">
                    <span className="truncate">{candidate.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Applied {new Date().toLocaleDateString()}</span>
                  </div>
                </TableCell>

                {/* Stage badge (Editable) */}
                <TableCell>
                  <Select 
                    value={displayStatus} 
                    onValueChange={(val) => handleStatusChange(candidate.id, val as CandidateStatus)}
                    disabled={isUpdatingStatus === candidate.id}
                  >
                    <SelectTrigger className={`h-8 w-[160px] text-[11px] font-black uppercase tracking-wider border transition-all ${getStatusBadgeClass(displayStatus)} shadow-none hover:shadow-sm`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl">
                      {STAGE_OPTIONS.map((stage) => (
                        <SelectItem key={stage} value={stage} className="text-xs font-semibold">{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Score */}
                <TableCell className="text-center">
                  {candidate.resume_score !== null ? (
                    <div className="flex items-center justify-center gap-3">
                      <Progress value={candidate.resume_score} className="h-1.5 w-24 bg-slate-100 ring-1 ring-slate-100" />
                      <span className={`text-[13px] font-black tabular-nums w-8 ${getScoreColor(candidate.resume_score)}`}>
                        {Math.round(candidate.resume_score)}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  )}
                </TableCell>

                {/* Interview Score */}
                <TableCell className="text-center">
                   {candidate.interview_score !== undefined && candidate.interview_score !== null ? (
                     <div className="flex flex-col items-center gap-1">
                        <span className={`text-[13px] font-black tabular-nums transition-all ${getScoreColor(candidate.interview_score)}`}>
                            {Math.round(candidate.interview_score)}%
                        </span>
                        <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className={`h-full transition-all ${candidate.interview_score >= 80 ? 'bg-emerald-500' : candidate.interview_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                             style={{ width: `${candidate.interview_score}%` }} 
                           />
                        </div>
                     </div>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">—</span>
                    )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2 text-nowrap min-w-[200px]">
                    {/* Resume Analysis — Always visible */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-indigo-200 text-indigo-700 bg-indigo-50/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-[11px] font-black uppercase tracking-tighter"
                      onClick={() => openReviewSheet(candidate, "analysis")}
                    >
                      <Zap className="w-3 h-3 mr-1.5 fill-current" />
                      Resume Analysis
                    </Button>
                    {/* Interview Cockpit — always visible, inactive if not at Interview stage */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-block" />}>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 border-violet-200 text-violet-700 bg-violet-50/30 transition-all text-[11px] font-black uppercase tracking-tighter ${
                              isAdvanced 
                                ? "hover:bg-violet-600 hover:text-white hover:border-violet-600 shadow-sm" 
                                : "opacity-40 cursor-not-allowed grayscale"
                            }`}
                            onClick={() => isAdvanced && openReviewSheet(candidate, "guide")}
                          >
                            <MessageSquareQuote className="w-3 h-3 mr-1.5 fill-current" />
                            Interview Cockpit
                          </Button>
                        </TooltipTrigger>
                        {!isAdvanced && (
                          <TooltipContent side="top" className="bg-slate-900 text-white text-[10px] p-3 rounded-lg font-bold border-slate-800 shadow-xl">
                            Set candidate status to <strong>"Interview"</strong> to use Interview Cockpit
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    {/* Delete — Always visible */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      onClick={() => handleDeleteCandidate(candidate.id)}
                      disabled={isDeleting === candidate.id}
                    >
                      {isDeleting === candidate.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ── Candidate Review Sheet (Integrated Guide, Resume Analysis, etc.) ── */}
      <CandidateReviewSheet
        candidate={reviewCandidate ? { ...reviewCandidate, stage: localStatuses[reviewCandidate.id] || reviewCandidate.stage } : null}
        guideData={guideData}
        isOpen={!!reviewCandidate}
        isRefreshing={isGenerating || isRefreshingReview}
        initialTab={activeTab}
        onRefresh={(force?: boolean) => reviewCandidate && handleGenerateGuide(reviewCandidate, !!force)}
        onRefreshReview={handleRefreshReview}
        onCandidateUpdate={handleCandidateUpdate}
        onStageChange={(newStage) => reviewCandidate && handleStatusChange(reviewCandidate.id, newStage as CandidateStatus)}
        onClose={() => {
          if (!isGenerating && !isRefreshingReview) {
            setReviewCandidate(null);
            // DO NOT setGuideData(null) here to allow it to persist if reopening same candidate
          }
        }}
      />
    </div>
  );
}
