import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const url = process.env.TEST_URL || "http://127.0.0.1:5173";
const results = [];

try {
  for (const challenge of [0, 1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const metrics = { frameCalls: 0, samples: [], domMutations: 0 };
      window.__singularityRenderMetrics = metrics;
      window.__singularityMutationObserver = new MutationObserver(records => {
        metrics.domMutations += records.length;
      });
      window.__singularityMutationObserver.observe(document, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
      const patched = new Set();
      for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
          const original = prototype[name];
          if (typeof original !== "function" || patched.has(original)) continue;
          patched.add(original);
          prototype[name] = function (...args) {
            metrics.frameCalls++;
            return original.apply(this, args);
          };
        }
      }
      const sample = () => {
        metrics.samples.push(metrics.frameCalls);
        metrics.frameCalls = 0;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(url);
    await page.locator(`[data-home-challenge="${challenge}"]`).click();
    await page.locator("#practice").click();
    await page.waitForFunction(() => document.body.classList.contains("playing"));
    await page.waitForTimeout(1_500);
    await page.evaluate(() => {
      window.__singularityRenderMetrics.samples.length = 0;
      window.__singularityRenderMetrics.domMutations = 0;
      window.__singularityMutationObserver.takeRecords();
    });
    await page.waitForTimeout(2_000);
    const { samples, domMutations } = await page.evaluate(() => ({
      samples: window.__singularityRenderMetrics.samples.filter(value => value > 0),
      domMutations: window.__singularityRenderMetrics.domMutations,
    }));
    assert.ok(samples.length >= 60, `challenge ${challenge} produced too few rendered frames`);
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const mutationsPerSecond = domMutations / 2;
    assert.ok(mean <= 150, `challenge ${challenge} averaged ${mean.toFixed(1)} draw calls`);
    assert.ok(mutationsPerSecond <= 150, `challenge ${challenge} produced ${mutationsPerSecond.toFixed(1)} DOM mutations/sec`);
    assert.deepEqual(pageErrors, []);
    results.push({
      challenge,
      frames: samples.length,
      mean: Number(mean.toFixed(1)),
      p95,
      mutationsPerSecond: Number(mutationsPerSecond.toFixed(1)),
    });
    await page.close();
  }
  console.log(`PASS: warm draw-call budget ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
