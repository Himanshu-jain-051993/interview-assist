"use client";

import { useEffect, useState } from "react";
import { Role } from "@/lib/types";
import { RoleCard } from "@/components/dashboard/RoleCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Loader2, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jdFile, setJdFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchRoles() {
    try {
      setLoading(true);
      const response = await fetch("/api/roles");
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleUploadJD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", jdFile);
    
    try {
      const res = await fetch("/api/roles/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("JD Upload failed");
      
      setJdFile(null);
      setOpen(false);
      fetchRoles();
    } catch (err) {
      alert("Failed to upload JD: " + (err instanceof Error ? err.message : ""));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchRoles();
    } catch (err) {
      alert("Failed to delete role");
    }
  };

  const startEdit = (role: Role) => {
    setEditRole(role);
    setEditTitle(role.title);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/roles/${editRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (!res.ok) throw new Error("Update failed");
      setEditRole(null);
      fetchRoles();
    } catch (err) {
      alert("Failed to update role");
    } finally {
      setEditing(false);
    }
  };

  if (loading && roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading your pipelines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-rose-600">Error Loading Dashboard</h2>
        <p className="text-slate-500 mt-2">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Active Hiring Pipelines</h1>
          <p className="text-slate-500 mt-1">Manage your roles and track candidate progress across the funnel.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search pipelines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md flex items-center cursor-pointer transition-colors shadow-sm border-none outline-none">
                <Plus className="w-4 h-4 mr-2" />
                Create Pipeline
              </button>
            } />
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-10 text-white relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col gap-2">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2 backdrop-blur-md">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">Create New Pipeline</DialogTitle>
                <p className="text-indigo-100/80 text-sm font-medium">Upload a Job Description to initialize AI rubrics.</p>
              </div>
            </div>
            <form onSubmit={handleUploadJD} className="p-8 space-y-8 bg-white">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">JD File (.pdf, .docx)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    id="jd-upload"
                    accept=".pdf,.docx,.doc" 
                    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                    required
                    className="sr-only"
                  />
                    <label 
                      htmlFor="jd-upload" 
                      className={`flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${
                        jdFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-white hover:text-indigo-500'
                      }`}
                    >
                      {jdFile ? (
                        <>
                          <FileText className="w-8 h-8 mb-2" />
                          <span className="text-xs font-black uppercase tracking-widest text-center px-4">{jdFile.name}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-xs font-black uppercase tracking-widest">Select JD file</span>
                        </>
                      )}
                    </label>
                </div>
              </div>
              <div className="flex gap-3">
                <DialogClose render={<Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-100 text-slate-500 hover:bg-slate-50">Cancel</Button>} />
                <Button type="submit" className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100" disabled={!jdFile || uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {uploading ? "Parsing JD..." : "Create Pipeline"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateRole} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full text-sm border p-2 rounded-md"
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600" disabled={!editTitle || editing}>
                {editing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {roles.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-dashed border-slate-200 space-y-10">
          <div className="text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Welcome to Interview Assist</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">Your AI-powered hiring co-pilot. Follow the 3-step workflow below to screen candidates and generate structured interview evaluations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto px-6">
            <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow">1</div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Create a Pipeline</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">Click <strong>Create Pipeline</strong> and upload a job description (PDF or DOCX). The AI will parse the role details automatically.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow">2</div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Upload Resumes</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">Open the pipeline and upload candidate resumes. The AI scores each resume against the role's rubrics, ranking them by fit.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow">3</div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Run AI Interviews</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">For shortlisted candidates, upload interview transcripts to generate detailed AI evaluations with verdicts, rubric scores, and hiring recommendations.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles
            .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((role) => (
              <RoleCard key={role.id} role={role} onEdit={startEdit} onDelete={handleDeleteRole} />
            ))}
        </div>
      )}
    </div>
  );
}
