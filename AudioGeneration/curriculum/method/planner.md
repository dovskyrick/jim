# Planner — how to write `items.json` for a module

Input: `module.json` (themes, items per lesson). Output: `items.json`, one array of items for all lessons.

## What an item is
Something the learner must be able to **say**: a word (`ψωμί`), a fixed phrase (`πόσο κάνει;`) or a structure (`θέλω να…`). Function words (`και`, `το`, `ένα`) are items too: a lesson can't use a word that is not an item.

```json
{ "id": "i001", "target": "Γεια σας", "meaning": "hello (polite or to several people)", "type": "phrase", "lesson": 1, "notes": "polite form; informal is Γεια σου" }
```
Optional: `forms` (other inflections the lessons may use once the item is taught, e.g. `["Αμερικανίδα"]` or verb persons), `syllables` (for words, if the estimate would be wrong).

## Rules
1. **8–12 new items per lesson**, ids `i001`, `i002`, … in lesson order, never reused.
2. **Serve the theme.** Each lesson's items let the learner act out its situation by the end.
3. **Frequency first.** Prefer the most common everyday words and phrases; add function words as soon as sentences need them.
4. **Build on earlier lessons.** Each lesson should combine its new items with earlier ones into many new sentences; check that useful combinations exist.
5. **Grammar by stealth.** Introduce useful verb forms as items or `forms` (`θέλω` I want, `θέλετε` you want (polite)). Keep Module 1 in the present tense, plus `θα` + verb late in the module.
6. **Politeness.** Use the polite plural (`εσείς`) with strangers; teach informal forms where the theme involves friends.
7. **Review lessons** (10, 20, 30) introduce only a few items (still ≥ 8, mostly small useful words) and lean on combination.
8. **Originality:** lesson 1 must not combine "excuse me", "understand", "English" and "American" (the checker blocks it); don't reproduce any commercial course's word order.
9. Greek script only in `target`, with correct accents.

Then run `npm run curriculum -- plan-check greek/module1` and fix every problem.
