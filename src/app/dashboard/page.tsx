"use client";

import { useEffect, useState } from "react";
import { Role } from "@/lib/types";
import { RoleCard } from "@/components/dashboard/RoleCard";
import { Plus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Job Description</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadJD} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">JD File (.pdf, .docx)</label>
                <input 
                  type="file" 
                  accept=".pdf,.docx,.doc" 
                  onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-sm border p-2 rounded-md"
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600" disabled={!jdFile || uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {uploading ? "Parsing JD..." : "Upload & Parse"}
              </Button>
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
