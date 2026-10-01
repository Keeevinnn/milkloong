import { readFileSync } from "node:fs";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
new Function(readFileSync(join(root, "js/rules.js"), "utf8"))();

const R = globalThis.MF.rules;
assert.strictEqual(R.W, 500);
assert.strictEqual(R.H, 700);
assert.strictEqual(R.MAX_STAGE, 9);
assert.strictEqual(R.STAGES[7].r, 92);
assert.strictEqual(R.STAGES[9].r, 132);
assert.strictEqual(R.scoreFor(2), 1);
assert.strictEqual(R.scoreFor(7), 21);
assert.strictEqual(R.scoreFor(9), 36);
assert.strictEqual(R.clamp(5, 10, 20), 10);
assert.strictEqual(R.clampX(0, 24), 28);          // WALL=4 → 24+4
assert.strictEqual(R.clampX(9999, 24), 472);      // 500-24-4
const p = R.clampPos(1, 1, 30);
assert.deepStrictEqual(p, { x: 34, y: 34 });
let ones = 0;
for (let i = 0; i < 4000; i++) if (R.randSpawnStage(Math.random) === 1) ones++;
assert.ok(ones > 2600 && ones < 3000, `权重偏离: ${ones}/4000`);
console.log("RULES TESTS PASS");
