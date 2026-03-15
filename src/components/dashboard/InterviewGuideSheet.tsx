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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    HelpCircle, 
    Target, 
    TrendingUp, 
    TrendingDown,
    Zap,
    Scale,
    RotateCcw,
    ShieldAlert
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Question {
  question: string;
  rubricParameter: string;
  lookFor: {
    strong: string;
    poor: string;
  };
}

interface GuideCategory {
  category: string;
  questions: Question[];
}

interface InterviewGuideSheetProps {
  candidate: Candidate | null;
  guideData: { guide: GuideCategory[] } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewGuideSheet({ candidate, guideData, isOpen, onClose }: InterviewGuideSheetProps) {
  if (!candidate) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col p-0">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Interview Architect</Badge>
              <Badge variant="outline" className="font-bold border-slate-200 text-slate-500">Expert Agent</Badge>
            </div>
            <SheetTitle className="text-2xl font-black text-slate-900 tracking-tight">
              Interview Guide: {candidate.name}
            </SheetTitle>
            <SheetDescription className="text-slate-500 font-medium">
              A tailored interview plan with stress-tests and rubric-aligned signals.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-8">
          {!guideData ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
               <Zap className="w-8 h-8 animate-pulse mb-2 text-indigo-400" />
               <p className="font-medium">Architecting your questions...</p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {guideData.guide.map((cat, i) => (
                <section key={i} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{cat.category}</h3>
                  </div>

                  <div className="space-y-8 ml-4">
                    {cat.questions.map((q, j) => (
                      <div key={j} className="space-y-4 group">
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                             <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                             <p className="text-lg font-bold text-slate-800 leading-snug group-hover:text-indigo-900 transition-colors">
                                {q.question}
                             </p>
                          </div>
                          <div className="flex items-center gap-2 ml-8">
                             <Target className="w-4 h-4 text-slate-400" />
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Rubric: {q.rubricParameter}
                             </span>
                          </div>
                        </div>

                        <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 space-y-2">
                             <div className="flex items-center gap-2 text-emerald-700">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-wider">Strong Signals</span>
                             </div>
                             <p className="text-sm text-emerald-800/80 leading-relaxed font-medium">
                                {q.lookFor.strong}
                             </p>
                          </div>

                          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100/50 space-y-2">
                             <div className="flex items-center gap-2 text-rose-700">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-wider">Red Flags</span>
                             </div>
                             <p className="text-sm text-rose-800/80 leading-relaxed font-medium">
                                {q.lookFor.poor}
                             </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {i < guideData.guide.length - 1 && <Separator className="bg-slate-100 mt-10" />}
                </section>
              ))}
              
              {/* Pattern Legend */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                 <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Architectural Patterns Used</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-indigo-300">
                          <Scale className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">10x Stress Test</span>
                       </div>
                       <p className="text-[11px] text-slate-400 leading-tight">Probes scalability and bottleneck identification under massive load.</p>
                    </div>
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-indigo-300">
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">The Inversion</span>
                       </div>
                       <p className="text-[11px] text-slate-400 leading-tight">Evaluates self-correction and diagnostic depth via hypothetical failure.</p>
                    </div>
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-indigo-300">
                          <Zap className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">Project Anchor</span>
                       </div>
                       <p className="text-[11px] text-slate-400 leading-tight">Grounds hypothetical logic in the candidate's actual historical metrics.</p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
