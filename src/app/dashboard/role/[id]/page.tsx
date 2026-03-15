"use client";

import { useEffect, useState, use } from "react";
import { Role, Candidate } from "@/lib/types";
import { CandidateTable } from "@/components/dashboard/CandidateTable";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  FileText,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RoleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  const { id } = use(params);
  const [role, setRole] = useState<Role | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch role info (we can get this from the roles list or a single role API)
        // For simplicity, we'll fetch all roles and find the one. 
        // In a real app, you'd have /api/roles/[id]
        const rolesRes = await fetch("/api/roles");
        const roles: Role[] = await rolesRes.json();
        const foundRole = roles.find(r => r.id === id);
        
        if (!foundRole) throw new Error("Role not found");
        setRole(foundRole);

        // Fetch candidates
        const candRes = await fetch(`/api/candidates?roleId=${id}`);
        if (!candRes.ok) throw new Error("Failed to fetch candidates");
        const candData = await candRes.json();
        setCandidates(candData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading pipeline details...</p>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-rose-600">Error Loading Role</h2>
        <p className="text-slate-500 mt-2">{error || "Role not found"}</p>
        <Link href="/dashboard">
          <Button className="mt-4" variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{role.title}</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3 py-1">
                {role.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {role.appliedCount} Total Applicants
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5 italic">
                Pipeline health: Healthy
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" />}>
                <FileText className="w-4 h-4 mr-2" />
                View Job Description
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden bg-slate-50 p-0 border-slate-200">
                <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200">
                  <DialogTitle className="text-xl font-bold text-slate-800">
                    Job Description: {role.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                    {role.full_jd_text || <span className="italic">No job description available for this role.</span>}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Candidate Pipeline */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Candidate Pipeline</h2>
        </div>
        
        {candidates.length > 0 ? (
          <CandidateTable candidates={candidates} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No candidates found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or post the job to attract talent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
