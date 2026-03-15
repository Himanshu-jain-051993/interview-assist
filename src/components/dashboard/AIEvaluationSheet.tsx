"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "@/lib/types";
import { CheckCircle2, BookOpen, Quote, Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AIEvaluationSheetProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AIEvaluationSheet({ candidate, isOpen, onClose }: AIEvaluationSheetProps) {
  if (!candidate) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md md:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">AI Powered</Badge>
            <Badge variant="outline" className="font-bold">{candidate.resume_score || 0}% Match</Badge>
          </div>
          <SheetTitle className="text-2xl font-bold">{candidate.name}</SheetTitle>
          <SheetDescription>
            Detailed candidate profile and resume summary.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Resume Summary
              </h3>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                "{candidate.resume_summary || "No summary available."}"
              </p>
            </section>

            <Separator className="bg-slate-100" />

            <section>
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Work Experience
              </h3>
              <div className="space-y-6">
                {candidate.profile_data.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{exp.role}</h4>
                        <p className="text-sm text-slate-600">{exp.company}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">{exp.duration}</span>
                    </div>
                    <ul className="space-y-1">
                      {exp.achievements.map((ach, j) => (
                        <li key={j} className="text-sm text-slate-600 flex gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-1 shrink-0" />
                          {ach}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Education
              </h3>
              <div className="space-y-3">
                {candidate.profile_data.education.map((edu, i) => (
                  <div key={i} className="flex flex-col p-3 rounded-lg bg-amber-50/30 border border-amber-100/50">
                    <span className="font-bold text-slate-800">{edu.school}</span>
                    <span className="text-sm text-slate-600">{edu.degree}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
