/**
 * Render a lesson JSON into the plain-text script the audio pipeline reads:
 * instructor text, then `"target..."` lines, each followed by `[pause Xs]`.
 */
import { Lesson, ModuleConfig } from './types.js';

export function renderScript(config: ModuleConfig, lesson: Lesson): string {
  const out: string[] = [];
  out.push(`${config.title} — Lesson ${lesson.lesson}`);
  out.push('');
  for (const line of lesson.lines) {
    if (line.say) out.push(line.say.trim());
    else if (line.target) out.push(`"${line.target.trim()}..."`);
    out.push(`[pause ${line.pause}s]`);
    out.push('');
  }
  return out.join('\n');
}
