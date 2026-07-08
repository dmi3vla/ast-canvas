#!/usr/bin/env tsx
/**
 * Live smoke test: Haiku LLM → buildSemanticMap → validate output.
 * Usage: INFINITY_LLM_LIVE=1 pnpm test:live-llm
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { indexWorkspace } from '@infinity-canvas/ast-graph';
import { contextPacker, createProvider, buildSemanticMap, projectCodemapToCanvas, buildCodemapUserPrompt, SYSTEM_CODEMAP, EXAMPLE_CODEMAP_MINI } from '../src/index';
import { parseCanvas, parseCodemap, safeParseCanvas } from '@infinity-canvas/schema';

const FIXTURES_DIR = resolve(__dirname, '../../../fixtures/mini-project');
const OUTPUT_FILE = '/tmp/infinity-haiku-map.json';

async function main() {
  const provider = process.env.INFINITY_LLM_PROVIDER || 'openai-compatible';
  const model = process.env.INFINITY_LLM_MODEL || 'kr/claude-haiku-4.5';
  const baseUrl = process.env.INFINITY_LLM_BASE_URL || 'http://localhost:20128/v1';

  console.log(`🔬 Live LLM smoke test`);
  console.log(`   provider: ${provider}`);
  console.log(`   model:    ${model}`);
  console.log(`   baseUrl:  ${baseUrl}`);
  console.log(`   fixture:  ${FIXTURES_DIR}`);
  console.log('');

  // 1) Index
  const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
  console.log(`📁 Indexed ${files.length} files`);

  // 2) Context packer
  const pack = await contextPacker(files, async (p) => readFileSync(p, 'utf-8'), { budgetChars: 40_000 });
  console.log(`📦 Pack: ${pack.stats.totalChars} chars, ${pack.manifests.length} manifests, ${pack.samples.length} samples`);

  // 3) Provider
  const llm = createProvider({
    provider: provider as any,
    model,
    baseUrl,
  });
  console.log(`🤖 Provider: ${llm.name}`);

  // 4) Try codemap mode first (better for Haiku), then project to canvas
  console.log('\n📝 Sending codemap prompt...');
  try {
    const userPrompt = buildCodemapUserPrompt(pack, 'MiniProject');
    const codemapRaw = await llm.complete([
      { role: 'system', content: SYSTEM_CODEMAP + '\n\n' + EXAMPLE_CODEMAP_MINI },
      { role: 'user', content: userPrompt },
    ]);

    // Strip fences
    let cleaned = codemapRaw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
    cleaned = cleaned.trim();

    const codemap = parseCodemap(cleaned);
    console.log(`✅ Codemap parsed: ${codemap.traces.length} traces`);
    codemap.traces.forEach(t => {
      console.log(`   [${t.id}] ${t.title} (${t.locations.length} locs)`);
    });

    // Project to canvas
    const canvas = projectCodemapToCanvas(codemap);
    console.log(`🎨 Canvas: ${canvas.nodes.length} nodes, ${canvas.edges.length} edges`);

    // Write output
    const output = {
      codemap: { traces: codemap.traces.map(t => ({ id: t.id, title: t.title, locCount: t.locations.length })) },
      canvas: { nodeCount: canvas.nodes.length, edgeCount: canvas.edges.length },
    };
    require('fs').writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n📄 Output written to ${OUTPUT_FILE}`);

  } catch (err: any) {
    console.error(`❌ Codemap failed: ${err.message}`);

    // Fallback: direct canvas
    console.log('\n🔄 Trying direct canvas mode...');
    const result = await buildSemanticMap(pack, llm);
    console.log(`✅ Canvas: ${result.diagnostics.nodeCount} nodes, ${result.diagnostics.edgeCount} edges`);
    console.log(`   Warnings: ${result.diagnostics.warnings.join(', ') || 'none'}`);

    const output = {
      canvas: { nodeCount: result.diagnostics.nodeCount, edgeCount: result.diagnostics.edgeCount },
    };
    require('fs').writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  }

  console.log('\n✅ Smoke test complete');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
