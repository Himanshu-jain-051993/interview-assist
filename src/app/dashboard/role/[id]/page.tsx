"use client";

import { useEffect, useState, use } from "react";
import { Trash2, Users, Search, FileText, Loader2, ChevronLeft, ArrowUpRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Role, Candidate } from "@/lib/types";
import { CandidateTable } from "@/components/dashboard/CandidateTable";
import { Badge } from "@/components/ui/badge";
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

  const [uploading, setUploading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", resumeFile);
    formData.append("roleId", id);

    try {
      const res = await fetch("/api/candidates/upload-v2", {
        method: "POST",
        body: formData,
      });
      const d = await res.json();
      setResumeFile(null);
      setOpenUpload(false);
      await fetchData(); // reload candidates
      toast.success("Candidate Uploaded Successfully", {
        description: `Analysis complete. Score: ${Math.round(d.score || 0)}%`,
      });
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      toast.error("Upload Failed", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setUploading(false);
    }
  };

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

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <Dialog>
              <DialogTrigger render={
                <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <FileText className="w-4 h-4 mr-2" />
                  View Job Description
                </Button>
              } />
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
          <Dialog open={openUpload} onOpenChange={setOpenUpload}>
            <DialogTrigger render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm h-9">
                <Users className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Resume (.pdf or .docx)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadResume} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resume File</label>
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    required
                    className="w-full text-sm border p-2 rounded-md"
                  />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!resumeFile || uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {uploading ? "Parsing Resume..." : "Upload & Parse"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {candidates.length > 0 ? (
          <CandidateTable 
            candidates={candidates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))} 
            onDeleted={fetchData} 
          />
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
