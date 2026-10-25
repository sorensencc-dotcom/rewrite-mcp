import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, buildPdfDownloadUrl } from '../scripts/fetch-contentdm-transcripts.mjs';

test('parseArgs parses valid CLI parameters', () => {
  const argv = ['--collection', 'p15847coll1', '--item-id', '101', '--dry-run'];
  const opts = parseArgs(argv);

  assert.equal(opts.collection, 'p15847coll1');
  assert.equal(opts.itemId, '101');
  assert.equal(opts.dryRun, true);
  assert.equal(opts.help, false);
});

test('parseArgs handles trailing flags without values without throwing', () => {
  const argv = ['--collection', 'p15847coll1', '--output-dir'];
  const opts = parseArgs(argv);

  assert.equal(opts.collection, 'p15847coll1');
  assert.ok(typeof opts.outputDir === 'string', 'outputDir falls back to default');
});

test('buildPdfDownloadUrl formats valid ContentDM binary URL', () => {
  const url = buildPdfDownloadUrl('https://cdm15847.contentdm.oclc.org', 'p15847coll1', '42');
  assert.equal(
    url,
    'https://cdm15847.contentdm.oclc.org/utils/getfile/collection/p15847coll1/id/42/filename/42.pdf'
  );
});
