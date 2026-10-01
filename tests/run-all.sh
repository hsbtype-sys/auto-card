#!/bin/bash
# 전체 검증. 에뮬레이터 테스트는 Java + firebase-tools + `npm i firebase@10.12.0`(FIREBASE_NM=그 node_modules 경로)가 있을 때만 실행
cd "$(dirname "$0")/.."
f=0
for t in rules scenarios sync-fake deep gemini rank nav costco benefits explain; do
  out=$(node tests/$t.test.js 2>&1); echo "$out" | grep -E "FAIL|ALL PASS|PASS   " ; echo "$out" | grep -q -E "FAIL|Error" && f=1
done
if [ -n "$FIREBASE_NM" ]; then NODE_PATH=$FIREBASE_NM node tests/emulator.test.js 2>&1 | grep -E "FAIL|PASS   "; fi
exit $f
