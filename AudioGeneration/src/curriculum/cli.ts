/**
 * Lesson text generator — command line.
 *
 *   npm run curriculum -- <command> <language>/<module> [lesson]
 *
 * Commands: status | plan-check | brief N | check N | render N | coverage | approve N | publish N
 * See curriculum/RUNBOOK.md for the order of work.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Item, Lesson, ModuleConfig } from './types.js';
import { buildSkeleton } from './scheduler.js';
import { checkLesson, checkPlan } from './checker.js';
import { buildBrief } from './brief.js';
import { renderScript } from './render.js';
import { pad2 } from './text.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CURRICULUM = resolve(ROOT, 'curriculum');

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (e) {
    fail(`Could not read ${path}: ${(e as Error).message}`);
  }
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function paths(mod: string) {
  const dir = resolve(CURRICULUM, mod);
  return {
    dir,
    module: resolve(dir, 'module.json'),
    items: resolve(dir, 'items.json'),
    lesson: (n: number) => resolve(dir, 'lessons', `lesson${pad2(n)}.json`),
    brief: (n: number) => resolve(dir, 'briefs', `lesson${pad2(n)}.md`),
    script: (n: number) => resolve(dir, 'scripts', `lesson${pad2(n)}.txt`),
    coverage: resolve(dir, 'reports', 'coverage.json'),
  };
}

function load(mod: string) {
  const p = paths(mod);
  if (!existsSync(p.module)) fail(`No module.json at ${p.module}`);
  const config = readJson<ModuleConfig>(p.module);
  const items = existsSync(p.items) ? readJson<Item[]>(p.items) : [];
  return { p, config, items };
}

function lessonNumber(arg: string | undefined, config: ModuleConfig): number {
  const n = Number(arg);
  if (!Number.isInteger(n) || n < 1 || n > config.lessonCount) fail(`Give a lesson number 1..${config.lessonCount}`);
  return n;
}

function report(title: string, r: { errors: string[]; warnings: string[] }) {
  r.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  if (r.errors.length) {
    console.log(`✗ ${title}: ${r.errors.length} problem(s)`);
    r.errors.slice(0, 60).forEach(e => console.log(`  - ${e}`));
    if (r.errors.length > 60) console.log(`  … and ${r.errors.length - 60} more`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ ${title}: passed`);
  return true;
}

function main() {
  const [cmd, mod, arg] = process.argv.slice(2);
  if (!cmd || !mod) fail('Usage: npm run curriculum -- <status|plan-check|brief|check|render|coverage|approve|publish> <language>/<module> [lesson]');
  const { p, config, items } = load(mod);

  switch (cmd) {
    case 'plan-check': {
      if (!items.length) fail(`No items yet. Write ${p.items} first (see curriculum/method/planner.md).`);
      report(`plan (${items.length} items)`, checkPlan(config, items));
      break;
    }
    case 'brief': {
      const n = lessonNumber(arg, config);
      const plan = checkPlan(config, items);
      if (!report('plan', plan)) fail('Fix the plan before writing lessons.');
      const md = buildBrief(config, items, buildSkeleton(config, items, n), n);
      mkdirSync(dirname(p.brief(n)), { recursive: true });
      writeFileSync(p.brief(n), md, 'utf-8');
      console.log(`✓ brief written: ${p.brief(n)}`);
      break;
    }
    case 'check': {
      const n = lessonNumber(arg, config);
      if (!existsSync(p.lesson(n))) fail(`Missing ${p.lesson(n)}`);
      const lesson = readJson<Lesson>(p.lesson(n));
      if (lesson.lesson !== n) fail(`File says lesson ${lesson.lesson}, expected ${n}`);
      const r = checkLesson(config, items, buildSkeleton(config, items, n), lesson);
      console.log(`  estimated length: ${r.estimatedMinutes} min`);
      if (report(`lesson ${n}`, r) && lesson.status === 'draft') {
        lesson.status = 'checked';
        writeJson(p.lesson(n), lesson);
        console.log('  status → checked');
      }
      break;
    }
    case 'render': {
      const n = lessonNumber(arg, config);
      const lesson = readJson<Lesson>(p.lesson(n));
      if (lesson.status === 'draft') fail('Run check first: only checked lessons are rendered.');
      mkdirSync(dirname(p.script(n)), { recursive: true });
      writeFileSync(p.script(n), renderScript(config, lesson), 'utf-8');
      console.log(`✓ script written: ${p.script(n)}`);
      break;
    }
    case 'coverage': {
      const uses = new Map<string, number[]>();
      for (let n = 1; n <= config.lessonCount; n++) {
        if (!existsSync(p.lesson(n))) continue;
        const lesson = readJson<Lesson>(p.lesson(n));
        for (const line of lesson.lines) for (const id of line.items ?? []) {
          const list = uses.get(id) ?? [];
          if (!list.includes(n)) list.push(n);
          uses.set(id, list);
        }
      }
      const rows = items.map(i => ({ id: i.id, target: i.target, meaning: i.meaning, introduced: i.lesson, heardInLessons: uses.get(i.id) ?? [] }));
      writeJson(p.coverage, { note: 'Derived from items.json + lessons/. Do not edit; regenerate with the coverage command.', items: rows });
      const unused = rows.filter(r => r.heardInLessons.length === 0 && existsSync(p.lesson(r.introduced)));
      console.log(`✓ coverage written: ${p.coverage}`);
      if (unused.length) console.log(`  ⚠ ${unused.length} item(s) planned but never used: ${unused.map(r => r.id).join(', ')}`);
      break;
    }
    case 'approve': {
      // For humans only: marks a checked lesson as approved.
      const n = lessonNumber(arg, config);
      const lesson = readJson<Lesson>(p.lesson(n));
      if (lesson.status !== 'checked') fail(`Lesson ${n} is "${lesson.status}"; only "checked" lessons can be approved.`);
      lesson.status = 'approved';
      writeJson(p.lesson(n), lesson);
      console.log(`✓ lesson ${n} approved`);
      break;
    }
    case 'publish': {
      // Copies an approved script to lessons-content/ as TODO, so `npm run generate` voices it.
      const n = lessonNumber(arg, config);
      const lesson = readJson<Lesson>(p.lesson(n));
      if (lesson.status !== 'approved') fail(`Lesson ${n} is "${lesson.status}"; only approved lessons are published.`);
      const dest = resolve(ROOT, 'lessons-content', config.language, config.module, `lesson${pad2(n)}-TODO.txt`);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, renderScript(config, lesson), 'utf-8');
      lesson.status = 'published';
      writeJson(p.lesson(n), lesson);
      console.log(`✓ published to ${dest}`);
      break;
    }
    case 'status': {
      console.log(`${config.languageName} ${config.module} · creativity ${config.creativity} · ${items.length} items planned`);
      for (let n = 1; n <= config.lessonCount; n++) {
        const count = items.filter(i => i.lesson === n).length;
        const st = existsSync(p.lesson(n)) ? readJson<Lesson>(p.lesson(n)).status : '—';
        console.log(`  lesson ${pad2(n)}  items ${String(count).padStart(2)}  ${st.padEnd(9)}  ${config.lessonThemes[n - 1] ?? ''}`);
      }
      break;
    }
    default:
      fail(`Unknown command "${cmd}"`);
  }
}

main();
