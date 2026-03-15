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
import { Candidate } from "@/lib/types";
import { FileText, Sparkles, User, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AIEvaluationSheet } from "./AIEvaluationSheet";

interface CandidateTableProps {
  candidates: Candidate[];
}

export function CandidateTable({ candidates }: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied': return 'bg-slate-100 text-slate-700';
      case 'screening': return 'bg-blue-100 text-blue-700';
      case 'shortlisted': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  const handleGenerateGuide = (name: string) => {
    alert(`Interview guide generated for ${name}`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="w-[250px] font-semibold">Candidate Name</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Match Score</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <span>{candidate.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`${getStatusColor(candidate.status)} border-transparent`}>
                  {candidate.status}
                </Badge>
              </TableCell>
              <TableCell>
                {candidate.resume_score !== null ? (
                  <div className="flex items-center gap-3 w-40">
                    <Progress value={candidate.resume_score} className="h-1.5" />
                    <span className={`text-sm font-bold tabular-nums ${getScoreColor(candidate.resume_score)}`}>
                      {candidate.resume_score}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-400 italic">Pending Evaluation</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Review
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => handleGenerateGuide(candidate.name)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Interview Guide
                  </Button>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AIEvaluationSheet 
        candidate={selectedCandidate} 
        isOpen={!!selectedCandidate} 
        onClose={() => setSelectedCandidate(null)} 
      />
    </div>
  );
}
