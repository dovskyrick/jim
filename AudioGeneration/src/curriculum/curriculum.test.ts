import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSkeleton } from './scheduler.js';
import { checkLesson, checkPlan } from './checker.js';
import { renderScript } from './render.js';
import { answerGap, normalize, repeatGap, tokens } from './text.js';
import { Beat, Item, Lesson, Line, ModuleConfig } from './types.js';

const config: ModuleConfig = {
  language: 'greek',
  languageName: 'Greek',
  module: 'test',
  title: 'Greek Test',
  lessonCount: 3,
  creativity: 0.5,
  targetMinutes: 12,
  newItemsPerLesson: { min: 3, max: 4 },
  inLessonRecallSeconds: [5, 25, 125, 625],
  reviewAfterLessons: [1, 2],
  lessonThemes: ['café', 'bakery', 'kiosk'],
  avoidInLesson1: ['excuse me', 'understand', 'english', 'american'],
  status: 'draft',
};

const items: Item[] = [
  { id: 'i001', target: 'Γεια σας', meaning: 'hello (polite)', type: 'phrase', lesson: 1 },
  { id: 'i002', target: 'ένας καφές', meaning: 'a coffee', type: 'phrase', lesson: 1 },
  { id: 'i003', target: 'παρακαλώ', meaning: 'please', type: 'word', lesson: 1 },
  { id: 'i004', target: 'ευχαριστώ', meaning: 'thank you', type: 'word', lesson: 1 },
  { id: 'i005', target: 'ψωμί', meaning: 'bread', type: 'word', lesson: 2 },
  { id: 'i006', target: 'θέλω', meaning: 'I want', type: 'word', lesson: 2 },
  { id: 'i007', target: 'ναι', meaning: 'yes', type: 'word', lesson: 2 },
  { id: 'i008', target: 'νερό', meaning: 'water', type: 'word', lesson: 3 },
  { id: 'i009', target: 'όχι', meaning: 'no', type: 'word', lesson: 3 },
  { id: 'i010', target: 'πόσο κάνει', meaning: 'how much is it', type: 'phrase', lesson: 3 },
];

const byId = new Map(items.map(i => [i.id, i]));

/** A minimal mechanical writer: shows what a valid lesson looks like. */
function stubWrite(skeleton: Beat[], lesson: number): Lesson {
  const lines: Line[] = [];
  const t = (b: Beat, ids: string[]) => {
    const target = ids.map(id => byId.get(id)!.target).join(' ');
    return { beat: b.id, target, items: ids, pause: Math.max(repeatGap(target), 2) };
  };
  for (const b of skeleton) {
    const it = b.items[0] ? byId.get(b.items[0]) : undefined;
    switch (b.type) {
      case 'opening': lines.push({ beat: b.id, say: 'Welcome to the lesson.', pause: 1 }); break;
      case 'closing': lines.push({ beat: b.id, say: 'See you next time.', pause: 2 }); break;
      case 'dialogue':
      case 'roleplay':
        lines.push({ beat: b.id, say: 'Listen.', pause: 1 });
        for (const id of b.items) lines.push(t(b, [id]));
        break;
      case 'new':
        lines.push({ beat: b.id, say: `Here is how to say "${it!.meaning}".`, pause: 1 });
        if (b.buildup) {
          const w = it!.target;
          for (const piece of [w.slice(-2), w.slice(-4), w.slice(-6)]) lines.push({ beat: b.id, target: piece, pause: 2 });
        }
        lines.push(t(b, [it!.id]), t(b, [it!.id]));
        break;
      case 'recall':
      case 'review': {
        const target = it!.target;
        lines.push({ beat: b.id, say: `How do you say "${it!.meaning}"?`, pause: answerGap(target) });
        lines.push(t(b, [it!.id]));
        break;
      }
      case 'combine': {
        const target = b.items.map(id => byId.get(id)!.target).join(' ');
        lines.push({ beat: b.id, say: 'Now say it together.', pause: answerGap(target) });
        lines.push(t(b, b.items));
        break;
      }
    }
  }
  return {
    lesson, title: `Lesson ${lesson}`, status: 'draft',
    generatedBy: { writer: 'stub', promptVersion: 'test', creativity: 0.5, date: '2026-10-28' },
    lines,
  };
}

const withoutLength = (errors: string[]) => errors.filter(e => !e.startsWith('estimated length'));

test('normalize strips accents and final sigma', () => {
  assert.equal(normalize('Καφές'), 'καφεσ');
  assert.deepEqual(tokens('Πόσο κάνει;'), ['ποσο', 'κανει']);
});

test('plan passes, and catches duplicates and the classic opening', () => {
  assert.deepEqual(checkPlan(config, items).errors, []);
  const dup = [...items, { ...items[0], id: 'i011' }];
  assert.ok(checkPlan(config, dup).errors.some(e => e.includes('same target')));
  const classic = items.map(i => i.lesson === 1 && i.id === 'i003' ? { ...i, meaning: 'excuse me' } : i.lesson === 1 && i.id === 'i004' ? { ...i, meaning: 'do you understand' } : i);
  assert.ok(checkPlan(config, classic).errors.some(e => e.includes('different opening')));
});

test('skeleton is deterministic and follows the recall schedule', () => {
  const a = buildSkeleton(config, items, 2);
  const b = buildSkeleton(config, items, 2);
  assert.deepEqual(a, b);
  for (const id of ['i005', 'i006', 'i007']) {
    assert.ok(a.some(x => x.type === 'new' && x.items[0] === id), `new beat for ${id}`);
    assert.ok(a.filter(x => x.type === 'recall' && x.items[0] === id).length >= 3, `recalls for ${id}`);
  }
  assert.ok(a.some(x => x.type === 'review' && x.items[0] === 'i001'), 'lesson-1 item reviewed in lesson 2');
  assert.equal(a[0].type, 'opening');
  assert.equal(a.at(-1)!.type, 'closing');
});

test('a correct lesson passes (apart from length)', () => {
  for (const n of [1, 2, 3]) {
    const sk = buildSkeleton(config, items, n);
    const r = checkLesson(config, items, sk, stubWrite(sk, n));
    assert.deepEqual(withoutLength(r.errors), [], `lesson ${n}`);
  }
});

test('checker catches untaught words, short pauses, missing beats and Greek in instructor text', () => {
  const sk = buildSkeleton(config, items, 2);
  const good = stubWrite(sk, 2);

  const untaught = structuredClone(good);
  const idx = untaught.lines.findIndex(l => l.target && sk.find(b => b.id === l.beat)!.type === 'combine');
  untaught.lines[idx].target += ' νερό';
  assert.ok(checkLesson(config, items, sk, untaught).errors.some(e => e.includes('not taught yet')));

  const short = structuredClone(good);
  const q = short.lines.findIndex(l => l.say && sk.find(b => b.id === l.beat)!.type === 'recall');
  short.lines[q].pause = 0.5;
  assert.ok(checkLesson(config, items, sk, short).errors.some(e => e.includes('too short')));

  const missing = structuredClone(good);
  missing.lines = missing.lines.filter(l => l.beat !== sk[3].id);
  assert.ok(checkLesson(config, items, sk, missing).errors.some(e => e.includes(`beat ${sk[3].id}`)));

  const greekSay = structuredClone(good);
  greekSay.lines[0].say = 'Γεια σας everyone';
  assert.ok(checkLesson(config, items, sk, greekSay).errors.some(e => e.includes('Greek text inside')));
});

test('render produces the format the audio pipeline parses', () => {
  const sk = buildSkeleton(config, items, 1);
  const txt = renderScript(config, stubWrite(sk, 1));
  assert.ok(txt.startsWith('Greek Test — Lesson 1'));
  assert.match(txt, /"Γεια σας\.\.\."\n\[pause \d+(\.\d+)?s\]/);
  const pauses = txt.match(/\[pause [\d.]+s\]/g)!.length;
  assert.equal(pauses, stubWrite(sk, 1).lines.length);
});
