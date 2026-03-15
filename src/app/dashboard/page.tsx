"use client";

import { useEffect, useState } from "react";
import { Role } from "@/lib/types";
import { RoleCard } from "@/components/dashboard/RoleCard";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
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

    fetchRoles();
  }, []);

  if (loading) {
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
        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100">
          <Plus className="w-4 h-4 mr-2" />
          Create New Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No active roles found. Start by creating a new role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
