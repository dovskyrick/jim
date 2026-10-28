/**
 * Brief: everything the LLM writer needs for one lesson, as markdown.
 * The writer reads method/method.md once, then one brief per lesson.
 */
import { Beat, Item, ModuleConfig } from './types.js';
import { itemsForLesson, reviewItemsForLesson } from './scheduler.js';
import { pad2 } from './text.js';

export const PROMPT_VERSION = 'method-v1';

export function creativityRules(c: number): string {
  if (c <= 0.2) {
    return `Creativity ${c} (strict): use the cue templates from method.md word for word. Only choose the target phrases. Keep beats in exact order.`;
  }
  if (c < 0.8) {
    return `Creativity ${c} (balanced): vary the cue wording naturally (never copy the same cue three times in a row). You may add one-sentence pronunciation, grammar or culture notes. Keep beats in exact order.`;
  }
  return `Creativity ${c} (free): everything in "balanced", plus you may move a beat up to 3 places, and invent small scenes (who is speaking, where) to make practice vivid. Every beat must still appear.`;
}

const fmtItem = (i: Item) =>
  `| ${i.id} | ${i.target} | ${i.meaning} | ${i.type}${i.forms?.length ? ` · forms: ${i.forms.join(', ')}` : ''}${i.notes ? ` · ${i.notes}` : ''} |`;

export function buildBrief(config: ModuleConfig, items: Item[], skeleton: Beat[], lesson: number): string {
  const byId = new Map(items.map(i => [i.id, i]));
  const earlier = items.filter(i => i.lesson < lesson);
  const fresh = itemsForLesson(items, lesson);
  const reviews = reviewItemsForLesson(items, config, lesson);
  const label = (id: string) => {
    const it = byId.get(id);
    return it ? `${id} ${it.target} (${it.meaning})` : id;
  };

  const lines: string[] = [];
  lines.push(`# Brief — ${config.languageName} ${config.module}, lesson ${lesson}`);
  lines.push('');
  lines.push(`Theme: **${config.lessonThemes[lesson - 1] ?? '(none)'}**`);
  lines.push(`Target length: ${config.targetMinutes} minutes. Prompt version: ${PROMPT_VERSION}.`);
  lines.push(creativityRules(config.creativity));
  lines.push('');
  lines.push(`Write \`lessons/lesson${pad2(lesson)}.json\` following method.md. Then run \`npm run curriculum -- check ${config.language}/${config.module} ${lesson}\`.`);
  lines.push('');
  lines.push(`## New items in this lesson (${fresh.length})`);
  lines.push('| id | target | meaning | type / notes |');
  lines.push('|---|---|---|---|');
  fresh.forEach(i => lines.push(fmtItem(i)));
  lines.push('');
  lines.push(`## Items due for review (${reviews.length})`);
  if (reviews.length) {
    lines.push('| id | target | meaning | type / notes |');
    lines.push('|---|---|---|---|');
    reviews.forEach(i => lines.push(fmtItem(i)));
  } else lines.push('None.');
  lines.push('');
  lines.push(`## Already known before this lesson (${earlier.length}) — the ONLY other words you may use`);
  lines.push(earlier.length ? earlier.map(i => `${i.id} ${i.target} = ${i.meaning}`).join(' · ') : 'Nothing yet: this is the first lesson.');
  lines.push('');
  lines.push(`## Skeleton (${skeleton.length} beats) — every beat needs lines, in this order`);
  lines.push('| beat | at | type | items | note |');
  lines.push('|---|---|---|---|---|');
  for (const b of skeleton) {
    const m = Math.floor(b.atSeconds / 60), s = b.atSeconds % 60;
    const note = [b.buildup ? 'BUILD-UP' : '', b.note ?? ''].filter(Boolean).join(' · ');
    lines.push(`| ${b.id} | ${m}:${pad2(s)} | ${b.type} | ${b.items.map(label).join(', ')} | ${note} |`);
  }
  lines.push('');
  return lines.join('\n');
}
