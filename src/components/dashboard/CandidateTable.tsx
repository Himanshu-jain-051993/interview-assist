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
import { InterviewGuideSheet } from "./InterviewGuideSheet";
import { toast } from "sonner";

interface CandidateTableProps {
  candidates: Candidate[];
  onDeleted?: () => void;
}

const STAGE_OPTIONS: CandidateStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Rejected",
];

// Stages at/above Interview Scheduled — unlock guide
const ADVANCED_STAGES: CandidateStatus[] = ["Interview Scheduled"];

export function CandidateTable({ candidates, onDeleted }: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [guideCandidate, setGuideCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<string>("resume");
  const [guideData, setGuideData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Track status changes so the table badge updates without a page reload
  const [localStatuses, setLocalStatuses] = useState<Record<string, CandidateStatus>>({});

  const getDisplayStatus = (c: Candidate): CandidateStatus =>
    localStatuses[c.id] ?? (c.status as CandidateStatus);

  const handleStatusChange = async (id: string, newStatus: CandidateStatus) => {
    setIsUpdatingStatus(id);
    const prevStatus = localStatuses[id] || candidates.find(c => c.id === id)?.status;
    
    // Optimistic update
    setLocalStatuses((prev) => ({ ...prev, [id]: newStatus }));
    
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Stage updated: ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update stage");
      // Rollback
      if (prevStatus) setLocalStatuses((prev) => ({ ...prev, [id]: prevStatus as CandidateStatus }));
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":              return "text-slate-600 border-slate-200 bg-slate-50";
      case "screening":            return "text-blue-600 border-blue-200 bg-blue-50";
      case "shortlisted":          return "text-emerald-600 border-emerald-200 bg-emerald-50";
      case "interview scheduled":  return "text-violet-600 border-violet-200 bg-violet-50";
      case "rejected":             return "text-rose-600 border-rose-200 bg-rose-50";
      default:                     return "text-slate-600 border-slate-200 bg-slate-50";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const openReviewSheet = (candidate: Candidate, tab: string) => {
    setActiveTab(tab);
    setGuideCandidate(candidate);
    if (tab === "guide") {
      handleGenerateGuide(candidate);
    }
  };

  const handleGenerateGuide = async (candidate: Candidate, force = false) => {
    if (!force && guideData && guideCandidate?.id === candidate.id) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, roleId: candidate.roleId, force }),
      });
      if (!res.ok) throw new Error("Failed to generate guide");
      setGuideData(await res.json());
    } catch (err) {
      console.error("Error generating guide:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    setIsDeleting(candidateId);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onDeleted?.();
    } catch (err) {
      alert("Failed to delete candidate");
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
            <TableHead className="font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 text-center">Fit Score</TableHead>
            <TableHead className="text-right font-bold text-[11px] uppercase tracking-widest text-slate-500 py-4 pr-6">Quick Actions</TableHead>
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
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-3 w-32">
                        <Progress value={candidate.resume_score} className="h-1.5 bg-slate-100 ring-1 ring-slate-100" />
                        <span className={`text-[13px] font-black tabular-nums w-8 ${getScoreColor(candidate.resume_score)}`}>
                          {Math.round(candidate.resume_score)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 group/score relative cursor-help">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                           Rubric: {candidate.resume_review_data?.scores?.overall_fit_score ? candidate.resume_review_data.scores.overall_fit_score.toFixed(1) : "?"} / 4.0
                         </span>
                         <Info className="w-2.5 h-2.5 text-slate-300 group-hover/score:text-slate-500 transition-colors" />
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-medium leading-relaxed rounded-lg opacity-0 group-hover/score:opacity-100 transition-opacity z-20 pointer-events-none shadow-xl">
                           This score is a weighted average of {candidate.resume_review_data?.universal_rubric_scores?.length || 5} universal match parameters and {candidate.resume_review_data?.role_specific_rubric_scores?.length || 5} role-specific signals.
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest italic">Analyzing...</span>
                    </div>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2 text-nowrap">
                    {/* Resume Analysis — Always visible */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-indigo-200 text-indigo-700 bg-indigo-50/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-[11px] font-black uppercase tracking-tighter"
                      onClick={() => openReviewSheet(candidate, "resume")}
                    >
                      <Zap className="w-3 h-3 mr-1.5 fill-current" />
                      Resume Analysis
                    </Button>

                    {/* Interview Guide — only for advanced stages */}
                    {isAdvanced && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-[11px] font-black uppercase tracking-tighter"
                        onClick={() => openReviewSheet(candidate, "guide")}
                      >
                        <MessageSquareQuote className="w-3 h-3 mr-1.5" />
                        Interview Guide
                      </Button>
                    )}

                    {/* Delete — only visible on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCandidate(candidate.id);
                      }}
                      disabled={isDeleting === candidate.id}
                    >
                      {isDeleting === candidate.id ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" /> }
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ── Candidate Review Sheet (Integrated Guide, Resume Analysis, etc.) ── */}
      <InterviewGuideSheet
        candidate={guideCandidate}
        guideData={guideData}
        isOpen={!!guideCandidate}
        isRefreshing={isGenerating}
        onRefresh={() => guideCandidate && handleGenerateGuide(guideCandidate, true)}
        onClose={() => {
          if (!isGenerating) {
            setGuideCandidate(null);
            setGuideData(null);
          }
        }}
      />
    </div>
  );
}
