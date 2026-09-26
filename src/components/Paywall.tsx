  return (
    <div className={`not-prose relative overflow-hidden ${bare ? "" : "my-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"}`}>
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Lock className="h-3 w-3" /> Subscribers only
        </span>
        <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-foreground">
          {headline || `The ${label} beyond this point are for subscribers`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {blurb || "Questions stay free to read. Subscribe once to reveal answers across Ompath Study — plus detailed explanations, supporting study details, and downloadable PDF handouts where available."}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><Eye className="h-3 w-3 text-primary" /> Reveal every answer</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><Check className="h-3 w-3 text-primary" /> Detailed explanations &amp; study details</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><Download className="h-3 w-3 text-primary" /> PDF handouts</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><Mail className="h-3 w-3 text-primary" /> Access follows your email</span>
        </div>

        <div className="mt-5 inline-flex overflow-hidden rounded-full border border-border">
          <button
            type="button"
            onClick={() => { setMode("buy"); setState("idle"); }}
            className={`px-4 py-1.5 text-xs font-bold ${mode === "buy" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Pay with M-Pesa
          </button>
          <button
            type="button"
            onClick={() => { setMode("code"); setState("idle"); }}
            className={`px-4 py-1.5 text-xs font-bold ${mode === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            I have a code
          </button>
        </div>

        {mode === "buy" ? (
          <>
            <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`rounded-xl border p-3 transition-colors ${planId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{p.label}</p>
                  <p className="mt-1 font-serif text-lg font-bold text-foreground">KES {p.price}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.days >= 365 ? "12 months" : p.days >= 85 ? "3 months" : `${p.days} days`}
                    {p.download ? " · PDF downloads" : ""}