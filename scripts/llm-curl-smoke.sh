#!/usr/bin/env bash
# Smoke-test local OpenAI-compatible endpoint used by Infinity Canvas.
# Usage:
#   ./scripts/llm-curl-smoke.sh
#   BASE_URL=http://localhost:20128/v1 MODEL=auto/best-coding-fast ./scripts/llm-curl-smoke.sh

set -euo pipefail

BASE_URL="${INFINITY_LLM_BASE_URL:-${BASE_URL:-http://localhost:20128/v1}}"
BASE_URL="${BASE_URL%/}"
MODEL="${INFINITY_LLM_MODEL:-${MODEL:-kr/claude-haiku-4.5}}"
KEY="${INFINITY_LLM_API_KEY:-${KEY:-local}}"

echo "=== LLM curl smoke ==="
echo "BASE_URL=$BASE_URL"
echo "MODEL=$MODEL"
echo

echo "1) GET $BASE_URL/models"
code=$(curl -sS -m 10 -o /tmp/ic-models.json -w '%{http_code}' "$BASE_URL/models" || true)
echo "   http=$code"
if [[ "$code" != "200" ]]; then
  echo "   FAIL: models endpoint not reachable"
  exit 1
fi
python3 - <<'PY'
import json
d=json.load(open('/tmp/ic-models.json'))
ids=[m.get('id') for m in d.get('data',[])]
print(f"   models: {len(ids)}")
for i in ids[:8]:
  print(f"    - {i}")
if len(ids)>8: print(f"    ... +{len(ids)-8} more")
PY
echo

echo "2) POST $BASE_URL/chat/completions (stream:false, small prompt)"
code=$(curl -sS -m 90 -o /tmp/ic-chat.json -w '%{http_code}' \
  "$BASE_URL/chat/completions" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $KEY" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly the word PONG and nothing else.\"}],\"max_tokens\":128,\"temperature\":0,\"stream\":false}" \
  || true)
echo "   http=$code"
if [[ "$code" != "200" ]]; then
  echo "   body:"; head -c 400 /tmp/ic-chat.json; echo
  echo "   FAIL: chat completions"
  exit 1
fi
python3 - <<'PY'
import json
raw=open('/tmp/ic-chat.json').read()
try:
  d=json.loads(raw)
  msg=(d.get('choices') or [{}])[0].get('message') or {}
  content=(msg.get('content') or '')
  print('   model:', d.get('model'))
  print('   content:', repr(content[:200]))
  if not content.strip():
    print('   WARN: empty content (check reasoning_content / SSE)')
    print('   reasoning:', repr((msg.get('reasoning_content') or '')[:200]))
  else:
    print('   OK chat content present')
except Exception as e:
  print('   not JSON, first 300 chars:')
  print(raw[:300])
  print('   err', e)
  raise SystemExit(1)
PY
echo

echo "3) Mini canvas-shaped JSON request"
code=$(curl -sS -m 120 -o /tmp/ic-canvas.json -w '%{http_code}' \
  "$BASE_URL/chat/completions" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $KEY" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"system\",\"content\":\"You output ONLY valid JSON, no markdown.\"},{\"role\":\"user\",\"content\":\"Generate a tiny semantic canvas for a mini JS project with files src/index.js and src/util.js. Schema: {\\\"nodes\\\":[{\\\"id\\\":string,\\\"type\\\":\\\"semantic\\\",\\\"x\\\":number,\\\"y\\\":number,\\\"width\\\":number,\\\"height\\\":number,\\\"text\\\":string}],\\\"edges\\\":[{\\\"id\\\":string,\\\"fromNode\\\":string,\\\"toNode\\\":string,\\\"kind\\\":\\\"semantic\\\"}]}. Max 3 nodes, 2 edges.\"}],\"max_tokens\":1024,\"temperature\":0.2,\"stream\":false}" \
  || true)
echo "   http=$code"
python3 - <<'PY'
import json,re
raw=open('/tmp/ic-canvas.json').read()
d=json.loads(raw)
content=((d.get('choices') or [{}])[0].get('message') or {}).get('content') or ''
print('   content chars:', len(content))
# strip fences
c=content.strip()
c=re.sub(r'^```(?:json)?\s*\n?','',c)
c=re.sub(r'\n?\s*```$','',c).strip()
try:
  doc=json.loads(c)
  nodes=doc.get('nodes') or []
  edges=doc.get('edges') or []
  print(f'   parsed canvas: {len(nodes)} nodes, {len(edges)} edges')
  for n in nodes[:5]:
    print('    node', n.get('id'), (n.get('text') or '')[:40].replace('\\n',' '))
  if len(nodes)>=1:
    print('   OK canvas-shaped JSON')
  else:
    print('   FAIL empty nodes')
    raise SystemExit(1)
except Exception as e:
  print('   parse fail:', e)
  print('   raw preview:', content[:400])
  raise SystemExit(1)
PY

echo
echo "=== all curl smokes passed ==="
