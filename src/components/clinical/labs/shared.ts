import { recordAttempt } from "@/clinical/progress";
import type { Skill } from "@/clinical/types";
import { logStudy } from "@/lib/studyLog";
import type { SeriesResult } from "@/components/clinical/McqSeries";

/** Record a practice drill (station, ladder, quiz…) so its skill counts towards the progress panel. Ids are prefixed "x-" so they are not mistaken for cases. */
export function saveDrill(id: string, mode: string, skill: Skill, r: SeriesResult) {
  recordAttempt({ caseId: `x-${id}`, at: Date.now(), mode, tally: { [skill]: [r.earned, r.total] }, score: r.pct, hints: r.hints });
  logStudy(3);
}
