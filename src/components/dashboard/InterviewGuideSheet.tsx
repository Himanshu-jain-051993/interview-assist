"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Zap, User, RefreshCw } from "lucide-react";

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
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const categoryMeta: Record<string, { description: string }> = {
  "Screening":    { description: "Initial screen — assess domain fit, motivation, and communication clarity." },
  "Technical R1": { description: "First technical round — architecture decisions and problem-solving depth." },
  "Technical R2": { description: "Advanced technical round — distributed systems, execution, and trade-offs." },
  "Culture":      { description: "Values and behavioural round — leadership, collaboration, and ownership signals." },
};

export function InterviewGuideSheet({
  candidate,
  guideData,
  isOpen,
  isRefreshing = false,
  onClose,
  onRefresh,
}: InterviewGuideSheetProps) {
  if (!candidate) return null;

  const categories = guideData?.guide ?? [];
  const defaultTab = categories[0]?.category ?? "Screening";
  const isLoading = !guideData && !isRefreshing;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl shadow-2xl border border-slate-200"
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 px-6 pt-4 pb-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold text-slate-900 leading-snug truncate">
                  Interview Guide — {candidate.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400 mt-0.5">
                  AI-generated, rubric-aligned questions. Cached — click Refresh to regenerate.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 h-7 px-2.5 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Regenerating…" : "Refresh"}
              </Button>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium text-[10px] py-0.5 px-2">
                Interview Architect
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/30">

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Zap className="w-5 h-5 animate-pulse text-indigo-400" />
              <p className="text-xs font-medium">Generating interview questions…</p>
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="h-full flex flex-col">

              {/* ── Tab bar ──────────────────────────────────────────── */}
              <TabsList className="shrink-0 justify-start gap-0 rounded-none border-b border-slate-200 bg-white px-4 pb-0 h-auto pt-0">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.category}
                    value={cat.category}
                    className="relative -mb-px px-4 py-2.5 text-xs font-medium rounded-none border-b-2 border-transparent text-slate-500 data-[state=active]:text-indigo-700 data-[state=active]:border-b-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                  >
                    {cat.category}
                    <span className="ml-1.5 inline-flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      {cat.questions.length}
                    </span>
                  </TabsTrigger>
                ))}

                {/* Refreshing indicator inside tab bar */}
                {isRefreshing && (
                  <span className="ml-auto self-center pr-2 flex items-center gap-1 text-[10px] text-indigo-500">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Regenerating…
                  </span>
                )}
              </TabsList>

              {/* ── Tab content panels ────────────────────────────────── */}
              {categories.map((cat) => {
                const meta = categoryMeta[cat.category];
                return (
                  <TabsContent
                    key={cat.category}
                    value={cat.category}
                    className="flex-1 min-h-0 overflow-y-auto mt-0 outline-none focus-visible:ring-0"
                  >
                    <div className="px-6 py-4 space-y-3">

                      {/* Category description */}
                      {meta && (
                        <p className="text-[11px] text-slate-400 leading-relaxed pl-3 border-l-2 border-slate-200">
                          {meta.description}
                        </p>
                      )}

                      {/* Question cards */}
                      {cat.questions.map((q, j) => (
                        <article
                          key={j}
                          className="bg-white border border-slate-200/80 rounded-lg overflow-hidden"
                        >
                          {/* Question text */}
                          <div className="flex items-start gap-2.5 px-4 py-3 border-b border-slate-100">
                            <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                              {j + 1}
                            </span>
                            <p className="text-sm text-slate-800 leading-relaxed">
                              {q.question}
                            </p>
                          </div>

                          {/* Signal columns */}
                          <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/50">
                            <div className="px-4 py-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-emerald-600">
                                <TrendingUp className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Strong Signal</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.strong}</p>
                            </div>
                            <div className="px-4 py-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-rose-500">
                                <TrendingDown className="w-3 h-3 shrink-0" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Red Flag</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{q.lookFor.poor}</p>
                            </div>
                          </div>
                        </article>
                      ))}

                      <div className="h-4" />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
