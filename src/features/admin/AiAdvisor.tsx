import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminService } from "../../app/services";
import type { AiAdvice } from "../../domain/admin";

/** Owner-facing RAG advisor. Advice is never applied automatically. */
export function AiAdvisor({ signals }: { signals: Record<string, unknown> }) {
  const [question, setQuestion] = useState("");
  const advisor = useMutation<AiAdvice, Error, void>({
    mutationFn: () => adminService.advise(signals, question),
  });

  return (
    <section className="admin-ai" aria-label="AI advisor">
      <div className="admin-ai-heading">
        <div>
          <p className="store-eyebrow">NEXT MOVE / RAG ADVISOR</p>
          <h2>What should we do next?</h2>
          <p className="admin-ai-intro">
            The advisor reads the current snapshot together with the CREWWW
            operating playbook. Every move stays a decision for you to approve.
          </p>
        </div>
        <form
          className="admin-ai-form"
          onSubmit={(event) => {
            event.preventDefault();
            advisor.mutate();
          }}
        >
          <label>
            <span>ASK A QUESTION / OPTIONAL</span>
            <input
              value={question}
              maxLength={400}
              placeholder="How do we prepare for the next drop?"
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button
            className="primary-store-button"
            type="submit"
            disabled={advisor.isPending}
          >
            {advisor.isPending ? "READING THE SIGNALS…" : "ASK THE ADVISOR ↗"}
          </button>
        </form>
      </div>

      {advisor.isError && (
        <p className="admin-ai-error" role="alert">
          The advisor could not be reached: {advisor.error.message}
        </p>
      )}

      {advisor.data && (
        <div className="admin-ai-result">
          <p className="admin-ai-summary">{advisor.data.summary}</p>
          <p className="admin-ai-provider">
            SOURCE / {advisor.data.provider} · RAG OVER{" "}
            {advisor.data.sources.length} PLAYBOOK ENTRIES
          </p>
          <div className="admin-ai-grid">
            {advisor.data.recommendations.map((item) => (
              <article key={item.title} className="admin-ai-card">
                <span className={`admin-ai-priority tone-${item.priority}`}>
                  {item.priority} · {item.horizon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>{item.evidence}</small>
              </article>
            ))}
          </div>
          <details className="admin-ai-sources">
            <summary>WHY THIS ADVICE / RETRIEVED CONTEXT</summary>
            {advisor.data.sources.map((source) => (
              <div key={source.title}>
                <b>{source.title}</b>
                <p>{source.excerpt}</p>
              </div>
            ))}
          </details>
        </div>
      )}
    </section>
  );
}
