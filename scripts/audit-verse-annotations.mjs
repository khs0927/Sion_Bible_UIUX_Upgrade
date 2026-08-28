import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const target = path.join(root, 'src/components/bible/BibleVerseSelectableList.tsx');
const source = fs.readFileSync(target, 'utf8');

const checks = [
  {
    ok: source.includes("const ANNOTATION_STORAGE_PREFIX = 'sion_bible_annotation_v2'"),
    message: 'annotation storage must use the v2 scoped namespace',
  },
  {
    ok: source.includes('annotationKey(referenceLabel, activeVerse)'),
    message: 'annotation writes/removals must include the book/chapter reference scope',
  },
  {
    ok: source.includes('readAnnotation(referenceLabel, verse.verse)'),
    message: 'annotation reads must include the book/chapter reference scope',
  },
  {
    ok: source.includes('}, [referenceLabel, verses]);'),
    message: 'annotation state must reload when the reference changes',
  },
  {
    ok: source.includes('clearLegacyAnnotationsOnce();'),
    message: 'legacy unscoped annotations must be cleared once to prevent false highlights',
  },
  {
    ok: !source.includes('window.location.pathname'),
    message: 'verse annotations must not be keyed only by pathname and verse number',
  },
];

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error('Verse annotation audit failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}

console.log('Verse annotation audit passed. Highlights are scoped to the current book/chapter reference.');
