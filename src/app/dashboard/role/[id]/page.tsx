"use client";

import { useEffect, useState, useRef, use } from "react";
import { Trash2, Users, Search, FileText, Loader2, ChevronLeft, ArrowUpRight, ArrowLeft, Zap, MessageSquareQuote, TrendingUp, Plus } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface RoleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  const { id } = use(params);
  const [role, setRole] = useState<Role | null>(null);
  const [resumeRubrics, setResumeRubrics] = useState<any[]>([]);
  const [interviewRubrics, setInterviewRubrics] = useState<any[]>([]);
  const [universalRubrics, setUniversalRubrics] = useState<any[]>([]);
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
      
      const roleRes = await fetch(`/api/roles/${id}`);
      if (!roleRes.ok) throw new Error("Role not found");
      const { role: foundRole, resumeRubrics: foundResume, interviewRubrics: foundInterview, universalRubrics: foundUniversal } = await roleRes.json();
      
      setRole(foundRole);
      setResumeRubrics(foundResume || []);
      setInterviewRubrics(foundInterview || []);
      setUniversalRubrics(foundUniversal || []);

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
      
      if (!res.ok) {
        throw new Error(d.message || `Upload failed with status ${res.status}`);
      }
      
      setResumeFile(null);
      setOpenUpload(false);
      await fetchData();
      toast.success("Candidate Uploaded Successfully", {
        description: `AI screening complete. Resume score: ${Math.round(d.score || 0)}%`,
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
                Active Hiring Pipeline
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
              <DialogTrigger render={
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-11 px-6 rounded-xl shadow-lg shadow-indigo-100 uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              } />
              <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
                <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 px-8 py-10 text-white relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2 backdrop-blur-md">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight uppercase">Add Candidate</DialogTitle>
                    <p className="text-indigo-100/80 text-sm font-medium">Upload a resume to begin AI screening.</p>
                  </div>
                </div>
                <form onSubmit={handleUploadResume} className="p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resume File (.pdf, .docx)</label>
                    <div className="relative group p-1">
                      <input 
                        type="file" 
                        id="resume-upload"
                        accept=".pdf,.docx,.doc" 
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        required
                        className="sr-only"
                      />
                      <label 
                        htmlFor="resume-upload" 
                        className={`flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${
                          resumeFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-white hover:text-indigo-500'
                        }`}
                      >
                        {resumeFile ? (
                          <>
                            <FileText className="w-8 h-8 mb-2" />
                            <span className="text-xs font-black uppercase tracking-widest text-center px-4">{resumeFile.name}</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-xs font-black uppercase tracking-widest">Select resume file</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <DialogClose render={<Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-100 text-slate-500 hover:bg-slate-50">Cancel</Button>} />
                    <Button type="submit" className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100/50" disabled={!resumeFile || uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                      {uploading ? "Analyzing..." : "Analyze Candidate"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Optimized Main Content Area */}
      <Tabs defaultValue="pipeline" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
          <TabsList className="bg-slate-200/40 p-1.5 rounded-2xl h-14 w-full md:w-auto">
            <TabsTrigger value="pipeline" className="px-8 h-11 text-[11px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-50/50 transition-all gap-2">
              <Users className="w-4 h-4" />
              Candidate Pipeline
            </TabsTrigger>
            <TabsTrigger value="standards" className="px-8 h-11 text-[11px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-50/50 transition-all gap-2">
              <Zap className="w-4 h-4" />
              Hiring Standards
            </TabsTrigger>
            <TabsTrigger value="jd" className="px-8 h-11 text-[11px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-50/50 transition-all gap-2">
              <FileText className="w-4 h-4" />
              Role Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="m-0 overflow-visible">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search candidates by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3.5 w-full md:w-80 bg-white border border-slate-100 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </TabsContent>
        </div>
        
        <TabsContent value="pipeline" className="m-0 outline-none space-y-8">


          {candidates.length > 0 ? (
            <CandidateTable 
              candidates={candidates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()))} 
              onDeleted={fetchData} 
            />
          ) : (
            <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 overflow-hidden relative">
              <div className="bg-gradient-to-br from-indigo-50/30 to-transparent p-16 md:p-32 flex flex-col items-center justify-center text-center">
                <div className="h-24 w-24 rounded-[2rem] bg-white shadow-2xl flex items-center justify-center mb-8 rotate-3 transform group-hover:rotate-0 transition-transform duration-500">
                  <Users className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Engage Your First Candidate</h3>
                <p className="text-slate-500 max-w-lg mb-12 text-sm font-medium leading-relaxed">
                  Start building your high-performance team. Upload resumes to unlock instantaneous AI screening, behavioral mapping, and deep technical audits.
                </p>
                <Button onClick={() => setOpenUpload(true)} className="h-16 px-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-5 h-5 mr-3" />
                  Upload First Resume
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="standards" className="m-0 outline-none space-y-8 pb-20">
          <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Zap className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Hiring Standards</h4>
              <p className="text-slate-500 text-[11px] font-medium uppercase tracking-widest">Role-specific evaluation rubrics for {role.category}</p>
            </div>
          </div>

          <Tabs defaultValue="resume-rubrics" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-auto inline-flex">
              <TabsTrigger value="resume-rubrics" className="px-6 h-9 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow transition-all gap-2">
                <FileText className="w-3.5 h-3.5" />
                Resume Rubrics
              </TabsTrigger>
              <TabsTrigger value="interview-rubrics" className="px-6 h-9 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow transition-all gap-2">
                <MessageSquareQuote className="w-3.5 h-3.5" />
                Interview Rubrics
              </TabsTrigger>
            </TabsList>

            {/* Resume Rubrics Tab */}
            <TabsContent value="resume-rubrics" className="m-0 outline-none">
              <div className="space-y-4">
                {[...universalRubrics, ...resumeRubrics].length > 0 ? (
                  [...universalRubrics, ...resumeRubrics].map((rub, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                      <div className="flex items-start justify-between mb-8">
                        <div className="space-y-2">
                          <Badge className={`border-none py-1 px-3 text-[8px] font-black uppercase tracking-widest ${i < universalRubrics.length ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {i < universalRubrics.length ? "Company Fit" : `${role.category} Mastery`}
                          </Badge>
                          <h6 className="font-black text-slate-800 text-base">{rub.parameter}</h6>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-rose-50/60 p-4 rounded-2xl space-y-2 border border-rose-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Poor</p>
                          <p className="text-[12px] leading-relaxed text-slate-600 font-medium">{rub.poor || 'Not specified'}</p>
                        </div>
                        <div className="bg-amber-50/60 p-4 rounded-2xl space-y-2 border border-amber-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Borderline</p>
                          <p className="text-[12px] leading-relaxed text-slate-600 font-medium">{rub.borderline || 'Meets basic requirements'}</p>
                        </div>
                        <div className="bg-indigo-50/60 p-4 rounded-2xl space-y-2 border border-indigo-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Good</p>
                          <p className="text-[12px] leading-relaxed text-slate-800 font-bold">{rub.good || 'Solid hire signal'}</p>
                        </div>
                        <div className="bg-emerald-50/60 p-4 rounded-2xl space-y-2 border border-emerald-200">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Strong</p>
                          <p className="text-[12px] leading-relaxed text-emerald-900 font-black">{rub.strong || 'Top 1% signal'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                    <FileText className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No Resume Rubrics Yet</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-xs">Upload a JD to auto-generate role-specific resume screening standards.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Interview Rubrics Tab */}
            <TabsContent value="interview-rubrics" className="m-0 outline-none">
              {interviewRubrics.length > 0 ? (
                <div className="space-y-4">
                  {interviewRubrics.map((rub, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-violet-500/5 transition-all group overflow-hidden relative">
                      <div className="absolute -top-4 -right-4 h-24 w-24 bg-violet-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xl">{i+1}</div>
                        <div>
                          <Badge className="bg-violet-100 text-violet-700 border-none px-2 py-0.5 text-[8px] font-black uppercase mb-1">Interview Rubric</Badge>
                          <h6 className="font-black text-slate-800 text-base uppercase tracking-tight">{rub.parameter}</h6>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
                          <p className="text-[9px] font-black uppercase text-rose-500 mb-2">Poor</p>
                          <p className="text-[12px] text-slate-600 font-medium">{rub.poor}</p>
                        </div>
                        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                          <p className="text-[9px] font-black uppercase text-amber-600 mb-2">Borderline</p>
                          <p className="text-[12px] text-slate-600 font-medium">{rub.borderline}</p>
                        </div>
                        <div className="bg-violet-50/60 p-4 rounded-2xl border border-violet-100">
                          <p className="text-[9px] font-black uppercase text-violet-600 mb-2">Good</p>
                          <p className="text-[12px] text-slate-900 font-bold">{rub.good}</p>
                        </div>
                        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                          <p className="text-[9px] font-black uppercase text-emerald-700 mb-2">Strong</p>
                          <p className="text-[12px] text-emerald-900 font-black">{rub.strong}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                  <Zap className="w-16 h-16 text-slate-300 mb-6 animate-pulse" />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-xs mb-2">Interview Rubrics Pending</p>
                  <p className="text-slate-400 text-sm max-w-[280px]">Re-upload the JD to trigger AI rubric generation for <b>{role.category}</b>.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="jd" className="m-0 outline-none pb-20">
          <div className="max-w-3xl mx-auto">
            <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-10 py-8 flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{role.title}</h3>
                  <p className="text-slate-400 text-xs font-medium mt-0.5">{role.category} · {role.status}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-10 py-10 space-y-1">
                {role.full_jd_text ? (
                  role.full_jd_text.split('\n').map((line, i) => {
                    const trimmed = line.trim();

                    // Blank line → spacer
                    if (!trimmed) return <div key={i} className="h-3" />;

                    // Section headers: ALL CAPS lines, or lines ending with ':', or known keywords
                    const isHeader =
                      /^(ABOUT|RESPONSIBILITIES|REQUIREMENTS|QUALIFICATIONS|BENEFITS|SKILLS|BONUS|DETAILS|THE ROLE|EXPERIENCE|OVERVIEW|WHAT YOU|WHO YOU|WHY|LOCATION|COMPENSATION|PERKS|CULTURE)/i.test(trimmed) ||
                      (trimmed.length < 60 && trimmed.endsWith(':')) ||
                      (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && /[A-Z]/.test(trimmed));

                    if (isHeader) {
                      return (
                        <div key={i} className="pt-8 pb-3 first:pt-0">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900">
                              {trimmed.replace(/:$/, '')}
                            </h4>
                          </div>
                          <div className="mt-3 border-b border-slate-100" />
                        </div>
                      );
                    }

                    // Bullet points
                    if (/^[•\-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
                      return (
                        <div key={i} className="flex gap-3 py-1.5 pl-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5 shrink-0" />
                          <p className="text-[14px] text-slate-600 leading-relaxed">
                            {trimmed.replace(/^[•\-*\d+\.]\s*/, '')}
                          </p>
                        </div>
                      );
                    }

                    // Regular paragraph
                    return (
                      <p key={i} className="text-[14px] text-slate-600 leading-relaxed py-1">
                        {line}
                      </p>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                    <FileText className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-widest">No job description available</p>
                  </div>
                )}
              </div>
            </article>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
