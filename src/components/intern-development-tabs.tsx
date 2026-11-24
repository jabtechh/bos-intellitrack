"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type InternReviewTab = "evaluations" | "feedback";

export function InternDevelopmentTabs({
  initialTab,
  evaluationCount,
  feedbackCount,
  evaluations,
  feedback,
}: {
  initialTab: InternReviewTab;
  evaluationCount: number;
  feedbackCount: number;
  evaluations: ReactNode;
  feedback: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<InternReviewTab>(initialTab);
  const evaluationTab = useRef<HTMLButtonElement>(null);
  const feedbackTab = useRef<HTMLButtonElement>(null);


  function selectFromKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let next: InternReviewTab | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      next = activeTab === "evaluations" ? "feedback" : "evaluations";
    } else if (event.key === "Home") {
      next = "evaluations";
    } else if (event.key === "End") {
      next = "feedback";
    }
    if (!next) return;
    event.preventDefault();
    setActiveTab(next);
    (next === "evaluations" ? evaluationTab : feedbackTab).current?.focus();
  }

  return <div>
    <div
      role="tablist"
      aria-label="Evaluations and Feedback"
      className="mb-5 flex w-full gap-2 rounded-xl border border-border bg-surface-muted p-1.5 sm:w-fit"
    >
      <button
        ref={evaluationTab}
        type="button"
        role="tab"
        id="intern-evaluations-tab"
        aria-controls="intern-evaluations-panel"
        aria-selected={activeTab === "evaluations"}
        tabIndex={activeTab === "evaluations" ? 0 : -1}
        onClick={() => setActiveTab("evaluations")}
        onKeyDown={selectFromKeyboard}
        className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${activeTab === "evaluations" ? "bg-surface text-foreground shadow-sm" : "text-secondary hover:text-foreground"}`}
      >
        Evaluations <span className="ml-1 text-xs text-muted">({evaluationCount})</span>
      </button>
      <button
        ref={feedbackTab}
        type="button"
        role="tab"
        id="intern-feedback-tab"
        aria-controls="intern-feedback-panel"
        aria-selected={activeTab === "feedback"}
        tabIndex={activeTab === "feedback" ? 0 : -1}
        onClick={() => setActiveTab("feedback")}
        onKeyDown={selectFromKeyboard}
        className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${activeTab === "feedback" ? "bg-surface text-foreground shadow-sm" : "text-secondary hover:text-foreground"}`}
      >
        Feedback <span className="ml-1 text-xs text-muted">({feedbackCount})</span>
      </button>
    </div>

    <section
      id="intern-evaluations-panel"
      role="tabpanel"
      aria-labelledby="intern-evaluations-tab"
      tabIndex={0}
      hidden={activeTab !== "evaluations"}
    >
      {evaluations}
    </section>
    <section
      id="intern-feedback-panel"
      role="tabpanel"
      aria-labelledby="intern-feedback-tab"
      tabIndex={0}
      hidden={activeTab !== "feedback"}
    >
      {feedback}
    </section>
  </div>;
}
