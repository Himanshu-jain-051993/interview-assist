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
  const [rubrics, setRubrics] = useState<any[]>([]);
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
      const { role: foundRole, rubrics: foundRubrics } = await roleRes.json();
      
      setRole(foundRole);
      setRubrics(foundRubrics);

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
                Active Hiring Pipeline
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
              <DialogContent className="max-w-[800px] w-full p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white h-[85vh] flex flex-col">
                <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 px-8 py-6 text-white relative shrink-0">
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <FileText className="w-5 h-5 text-indigo-100" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black tracking-tight">{role.title}</DialogTitle>
                      <p className="text-indigo-200/60 text-[10px] font-black uppercase tracking-widest">Master Talent Requirement</p>
                    </div>
                  </div>
                </div>
                <Tabs defaultValue="jd" className="flex-1 flex flex-col min-h-0">
                  <div className="px-10 pt-4 bg-slate-50/50 shrink-0">
                    <TabsList className="bg-slate-200/50 p-1 rounded-xl h-11 w-fit">
                      <TabsTrigger value="jd" className="px-6 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 transition-all">Job Details</TabsTrigger>
                      <TabsTrigger value="rubrics" className="px-6 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 transition-all">Assessment Rubrics</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto px-10 py-8 bg-slate-50/20">
                    <TabsContent value="jd" className="m-0 outline-none">
                      <article className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10 text-slate-700 font-outfit relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.01] pointer-events-none group-hover:opacity-[0.03] transition-opacity">
                          <FileText className="w-64 h-64 text-slate-900" />
                        </div>
                        <div className="relative z-10 space-y-2">
                          {role.full_jd_text ? (
                            role.full_jd_text.split('\n').map((line, i) => {
                              const trimmed = line.trim();
                              if (!trimmed) return <div key={i} className="h-2" />;
                              
                              const isPrimaryHeader = /^(ABOUT|RESPONSIBILITIES|REQUIREMENTS|QUALIFICATIONS|BENEFITS|SKILLS|BONUS|DETAILS|THE ROLE|EXPERIENCE)/i.test(trimmed) || (trimmed.length < 50 && trimmed.endsWith(':'));
                              
                              if (isPrimaryHeader) {
                                return (
                                  <h3 key={i} className="text-indigo-600 font-black text-sm uppercase tracking-widest mt-8 mb-4 flex items-center gap-3">
                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                    {trimmed.replace(/:$/, '')}
                                  </h3>
                                );
                              }
                              
                              if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                                return (
                                  <div key={i} className="flex gap-4 mb-3 pl-2 group/bullet">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 group-hover/bullet:scale-125 transition-transform" />
                                    <p className="flex-1 text-[15px] text-slate-600 font-medium leading-relaxed">
                                      {trimmed.replace(/^[•\-*]\s*/, '')}
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <p key={i} className="text-[15px] text-slate-600 font-normal leading-loose mb-4 last:mb-0">
                                  {line}
                                </p>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                              <FileText className="w-12 h-12 mb-4 opacity-20" />
                              <p className="italic font-medium">No job description available for this role.</p>
                            </div>
                          )}
                        </div>
                      </article>
                    </TabsContent>

                    <TabsContent value="rubrics" className="m-0 outline-none space-y-6">
                      <div className="bg-indigo-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
                        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                          <h4 className="text-xl font-black uppercase tracking-tight mb-2">Hiring Standards: {role.category}</h4>
                          <p className="text-indigo-100/80 text-xs font-medium max-w-xl leading-relaxed">
                            The following rubrics have been autonomously generated to match the objective requirements of this role. Every candidate is audited against these 4-point precision levels.
                          </p>
                        </div>
                      </div>

                      {rubrics.length > 0 ? (
                        <div className="space-y-6">
                          {rubrics.map((rub, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                              <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <h5 className="font-black text-slate-900 text-sm uppercase tracking-wider">{rub.parameter}</h5>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Metric {i+1}</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                <div className="p-6 space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Level 1: Poor</p>
                                  <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{rub.poor}</p>
                                </div>
                                <div className="p-6 space-y-2 bg-slate-50/20">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Level 2: Borderline</p>
                                  <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{rub.borderline}</p>
                                </div>
                                <div className="p-6 space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Level 3: Good</p>
                                  <p className="text-[12px] text-slate-600 leading-relaxed font-medium font-bold italic">{rub.good}</p>
                                </div>
                                <div className="p-6 space-y-2 bg-indigo-50/10">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Level 4: Strong</p>
                                  <p className="text-[12px] text-indigo-900 leading-relaxed font-black">{rub.strong}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-3xl border border-dashed border-slate-200">
                          <Zap className="w-12 h-12 mb-4 opacity-20" />
                          <p className="italic font-medium">Rubrics are being processed for this category...</p>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
                <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end">
                   <DialogClose render={<Button className="h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10">Back to Dashboard</Button>} />
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
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-10 text-white relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2 backdrop-blur-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase">Add Candidate</DialogTitle>
                  <p className="text-indigo-100/80 text-sm font-medium">Upload a resume to begin AI screening.</p>
                </div>
              </div>
              <form onSubmit={handleUploadResume} className="p-8 space-y-8 bg-white">
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
                  <Button type="submit" className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100" disabled={!resumeFile || uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                    {uploading ? "Analyzing..." : "Analyze Candidate"}
                  </Button>
                </div>
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
          <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 overflow-hidden relative">
            <div className="bg-gradient-to-br from-indigo-50/30 to-transparent p-16 md:p-24 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-8 rotate-3 transform group-hover:rotate-0 transition-transform duration-500">
                <Users className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Start Your Talent Pipeline</h3>
              <p className="text-slate-500 max-w-lg mb-12 text-sm font-medium leading-relaxed">
                Add your first candidate to unlock automated resume scoring, behavior-mapped interview guides, and deep AI-driven culture-fit analysis.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
                 <div className="space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Zap className="w-5 h-5 fill-current" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">1. Instant Scoring</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">AI immediately audits the resume against your JD and rubrics to provide a 0-100 fit score.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg"><MessageSquareQuote className="w-5 h-5" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">2. Smart Guides</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Unlock tailored interview questions designed to probe specific skills mentioned in the resume.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg"><TrendingUp className="w-5 h-5" /></div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">3. Insight Cockpit</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Upload transcripts to generate evidence-backed hiring verdicts and aggregated round performance.</p>
                 </div>
              </div>
              
              <div className="mt-16">
                 <Button onClick={() => setOpenUpload(true)} className="h-14 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100">
                    <Plus className="w-4 h-4 mr-2" />
                    Engage First Candidate
                 </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
