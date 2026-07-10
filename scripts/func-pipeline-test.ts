/**
 * Functional pipeline test (no GUI) — mirrors main IPC paths.
 * Usage: set -a && source .env && set +a && pnpm exec tsx scripts/func-pipeline-test.ts
 */
import { resolve, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { indexWorkspace, buildDepGraph, depGraphService, buildNodeCodemap } from '@infinity-canvas/ast-graph';
import {
  contextPacker,
  createProvider,
  buildSemanticMap,
  enrichCodemap,
  applyPrivacyToPack,
  isSendCodeSamplesEnabled,
} from '@infinity-canvas/semantic';
import { parseCanvas, parseCodemap, serializeDocument } from '@infinity-canvas/schema';

const ROOT = resolve(__dirname, '..');
const FIXTURE = join(ROOT, 'fixtures/mini-project');

const ok = (m: string) => console.log('✅', m);
const fail = (m: string): never => {
  console.error('❌', m);
  throw new Error(m);
};
const info = (m: string) => console.log('· ', m);

async function main() {
  console.log('\n=== Infinity Canvas functional test ===\n');
  info(`LLM: ${process.env.INFINITY_LLM_PROVIDER} ${process.env.INFINITY_LLM_BASE_URL}`);
  info(`model=${process.env.INFINITY_LLM_MODEL} sendSamples=${isSendCodeSamplesEnabled()}`);

  const llm = createProvider();
  if (llm.name !== 'openai-compatible') fail(`expected openai-compatible, got ${llm.name}`);
  ok(`createProvider → ${llm.name}`);

  const files = await indexWorkspace(FIXTURE);
  if (files.length < 3) fail(`too few files: ${files.length}`);
  ok(`indexWorkspace fixture: ${files.length} files`);

  const g = await buildDepGraph(files, { workspaceRoot: FIXTURE });
  const nodeCount = Object.keys(g.nodes).length;
  if (nodeCount < 2) fail(`depgraph too small: ${nodeCount}`);
  ok(`depGraph: ${nodeCount} nodes, ${g.edges.length} edges`);

  const ego = await depGraphService.getEgo(FIXTURE, ['src/index.js'], 1);
  if (!ego) fail('getEgo returned null');
  ok(`getEgo(src/index.js, d1): nodes=${ego.nodes.size} edges=${ego.edges.length}`);

  const pack = await contextPacker(files, async (p) => readFileSync(p, 'utf-8'), { budgetChars: 40_000 });
  applyPrivacyToPack(pack);
  const afterSample = pack.samples[0]?.content || '';
  if (!isSendCodeSamplesEnabled()) {
    if (!afterSample.includes('[code sample redacted:')) fail('privacy OFF should placeholder samples');
    ok(`privacy OFF: sample placeholder`);
  } else {
    ok(`privacy ON: sample len ${afterSample.length}`);
  }

  const packForMap = await contextPacker(files, async (p) => readFileSync(p, 'utf-8'), { budgetChars: 40_000 });
  applyPrivacyToPack(packForMap);

  console.log('\n⏳ buildSemanticMap via LLM...');
  const mapResult = await buildSemanticMap(packForMap, llm);
  info(
    `diag nodes=${mapResult.diagnostics.nodeCount} edges=${mapResult.diagnostics.edgeCount} retries=${mapResult.diagnostics.retries} warn=${mapResult.diagnostics.warnings.length}`,
  );
  if (mapResult.diagnostics.nodeCount < 1) fail('semantic map empty');
  const canvas = mapResult.document;
  parseCanvas(JSON.stringify(canvas));
  ok(`buildSemanticMap: ${canvas.nodes.length} nodes, ${canvas.edges.length} edges`);
  canvas.nodes.slice(0, 6).forEach((n) => info(`  node ${n.id}: ${(n.text || '').split('\n')[0].slice(0, 55)}`));

  const anchors = ['src/index.js', 'src/config.js', 'src/utils/helpers.js'];
  const structural = buildNodeCodemap(
    {
      id: 'fixture-root',
      text: '## Fixture root',
      semantic: { fileAnchors: anchors, summary: 'mini-project' },
    },
    g,
    FIXTURE,
  );
  if (!structural.traces?.length) fail('structural codemap no traces');
  ok(
    `CodemapBuilder: ${structural.traces.length} traces, locs=${structural.traces.reduce((a, t) => a + t.locations.length, 0)}`,
  );

  console.log('\n⏳ enrichCodemap via LLM...');
  const enrichPack = await contextPacker(files, async (p) => readFileSync(p, 'utf-8'), { budgetChars: 20_000 });
  applyPrivacyToPack(enrichPack);
  const enriched = await enrichCodemap({
    structural,
    pack: enrichPack,
    llm,
    allowedPaths: anchors,
  });
  info(
    `enrich provider=${enriched.diagnostics.provider} stripped=${enriched.diagnostics.strippedLocations} repaired=${enriched.diagnostics.repaired}`,
  );
  parseCodemap(JSON.stringify(enriched.codemap));
  const guides = enriched.codemap.traces.filter((t) => t.traceGuide).length;
  ok(`enrichCodemap: ${enriched.codemap.traces.length} traces, guides=${guides}`);

  const cachedMap = join(ROOT, '.infinity-canvas/semantic-map.canvas');
  if (existsSync(cachedMap)) {
    const doc = parseCanvas(readFileSync(cachedMap, 'utf-8'));
    ok(`app cache semantic-map.canvas: ${doc.nodes.length} nodes / ${doc.edges.length} edges`);
  } else {
    info('no monorepo semantic-map.canvas');
  }

  const logs = join(ROOT, '.infinity-canvas/logs/app.log');
  if (existsSync(logs)) {
    const lines = readFileSync(logs, 'utf-8').trim().split('\n').filter(Boolean);
    ok(`app.log lines: ${lines.length}`);
    for (const l of lines.slice(-4)) {
      const e = JSON.parse(l);
      info(`  log ${e.level} ${e.category}: ${e.msg}`);
      if (/sk-[a-zA-Z0-9]{10,}/.test(l)) fail('secret leaked in log');
    }
  }

  // highlight paths present on some canvas nodes (fileAnchors if any)
  const withAnchors = canvas.nodes.filter((n) => n.semantic?.fileAnchors?.length);
  ok(`canvas nodes with fileAnchors: ${withAnchors.length}/${canvas.nodes.length}`);

  const bundleDir = '/tmp/ic-func-bundle';
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'semantic-map.canvas'), JSON.stringify(serializeDocument(canvas), null, 2));
  writeFileSync(
    join(bundleDir, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        workspaceName: 'mini-project',
        files: ['semantic-map.canvas'],
      },
      null,
      2,
    ),
  );
  ok(`export bundle → ${bundleDir}`);

  console.log('\n=== ALL FUNCTIONAL CHECKS PASSED ===\n');
}

main().catch((e) => {
  console.error('\n=== FAILED ===', e);
  process.exit(1);
});
