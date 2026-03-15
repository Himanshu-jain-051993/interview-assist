"use client";

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
import { Candidate, CandidateStatus } from "@/lib/types";
import { Settings2, User, ChevronRight, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { CandidateActionsDialog } from "./CandidateActionsDialog";
import { InterviewGuideSheet } from "./InterviewGuideSheet";

interface CandidateTableProps {
  candidates: Candidate[];
}

// Stages at/above Interview Scheduled — unlock guide + transcript
const ADVANCED_STAGES: CandidateStatus[] = ["Interview Scheduled", "Rejected"];

export function CandidateTable({ candidates }: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [guideCandidate, setGuideCandidate] = useState<Candidate | null>(null);
  const [guideData, setGuideData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Track status changes so the table badge updates without a page reload
  const [localStatuses, setLocalStatuses] = useState<Record<string, CandidateStatus>>({});

  const getDisplayStatus = (c: Candidate): CandidateStatus =>
    localStatuses[c.id] ?? (c.status as CandidateStatus);

  const handleStatusChange = (id: string, newStatus: CandidateStatus) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: newStatus }));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":              return "bg-slate-100 text-slate-700 border-slate-200";
      case "screening":            return "bg-blue-100 text-blue-700 border-blue-200";
      case "shortlisted":          return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "interview scheduled":  return "bg-violet-100 text-violet-700 border-violet-200";
      case "rejected":             return "bg-rose-100 text-rose-700 border-rose-200";
      default:                     return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-rose-600";
  };

  const handleGenerateGuide = async (candidate: Candidate, force = false) => {
    setGuideCandidate(candidate);
    if (!force) setGuideData(null);
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
      if (!force) setGuideCandidate(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="w-[240px] font-semibold">Candidate Name</TableHead>
            <TableHead className="font-semibold">Stage</TableHead>
            <TableHead className="font-semibold">Match Score</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => {
            const displayStatus = getDisplayStatus(candidate);
            const isAdvanced = ADVANCED_STAGES.includes(displayStatus);

            return (
              <TableRow key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
                {/* Name */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="truncate">{candidate.name}</span>
                  </div>
                </TableCell>

                {/* Stage badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`border font-medium text-xs ${getStatusBadgeClass(displayStatus)}`}
                  >
                    {displayStatus}
                  </Badge>
                </TableCell>

                {/* Score */}
                <TableCell>
                  {candidate.resume_score !== null ? (
                    <div className="flex items-center gap-3 w-36">
                      <Progress value={candidate.resume_score} className="h-1.5" />
                      <span className={`text-sm font-bold tabular-nums ${getScoreColor(candidate.resume_score)}`}>
                        {candidate.resume_score}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Pending Evaluation</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Interview Guide — only for advanced stages */}
                    {isAdvanced && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                        onClick={() => handleGenerateGuide(candidate)}
                        disabled={isGenerating && guideCandidate?.id === candidate.id}
                      >
                        {isGenerating && guideCandidate?.id === candidate.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Interview Guide
                      </Button>
                    )}

                    {/* Candidate Actions — always visible */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 text-xs"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                      Candidate Actions
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* ── Candidate Actions Dialog ─────────────────────────────────── */}
      <CandidateActionsDialog
        candidate={selectedCandidate}
        currentStatus={selectedCandidate ? getDisplayStatus(selectedCandidate) : "Applied"}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onStatusChange={handleStatusChange}
        onOpenGuide={(c) => {
          setSelectedCandidate(null);
          handleGenerateGuide(c);
        }}
      />

      {/* ── Interview Guide Dialog ───────────────────────────────────── */}
      <InterviewGuideSheet
        candidate={guideCandidate}
        guideData={guideData}
        isOpen={!!guideCandidate}
        isRefreshing={isGenerating && !!guideData}
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
