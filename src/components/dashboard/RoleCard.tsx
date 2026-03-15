import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Role } from "@/lib/types";
import { Users, UserX, Search, PlayCircle } from "lucide-react";
import Link from "next/link";

interface RoleCardProps {
  role: Role;
}

export function RoleCard({ role }: RoleCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Open': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Link href={`/dashboard/role/${role.id}`} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
      <Card className="h-full border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold text-slate-800">{role.title}</CardTitle>
            <Badge variant="outline" className={`${getStatusColor(role.status)} font-medium`}>
              {role.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <MetricItem 
              icon={<Users className="w-4 h-4 text-slate-500" />} 
              label="Applied" 
              value={role.appliedCount} 
            />
            <MetricItem 
              icon={<PlayCircle className="w-4 h-4 text-emerald-500" />} 
              label="Interviewing" 
              value={role.interviewCount} 
            />
            <MetricItem 
              icon={<Search className="w-4 h-4 text-amber-500" />} 
              label="Review" 
              value={role.reviewCount} 
            />
            <MetricItem 
              icon={<UserX className="w-4 h-4 text-rose-500" />} 
              label="Rejected" 
              value={role.rejectedCount} 
            />
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex justify-end">
           <span className="text-xs font-medium text-slate-400">Click to view pipeline ↗</span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
    </div>
  );
}
