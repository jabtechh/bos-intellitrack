import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/page.tsx", "utf8");
const sections = readFileSync("src/components/landing/sections.tsx", "utf8");
const preview = readFileSync("src/components/landing/product-preview.tsx", "utf8");
const source = [page, sections, preview].join("\n");
const css = readFileSync("src/components/landing/landing.module.css", "utf8");

test("public landing is static and has no private data dependencies", () => {
  assert.match(page, /export default function Home/);
  assert.doesNotMatch(source, /use client|getCurrentUser|requireCurrentUser|lib\/prisma|lib\/supabase|fetch\(/);
});

test("all public destinations are existing sections or the shared login", () => {
  const ids = [...source.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  for (const [, href] of source.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith("#")) assert.ok(ids.includes(href.slice(1)), href);
    else assert.equal(href, "/login");
  }
  assert.match(sections, /Sign In to IntelliTrack/);
  assert.match(readFileSync("src/app/(auth)/login/page.tsx", "utf8"), /LoginForm/);
  assert.match(readFileSync("src/app/(authenticated)/layout.tsx", "utf8"), /requireCurrentUser/);
});

test("branding and claims respect current product boundaries", () => {
  assert.match(source, /Internship Management for Bo’s Coffee/);
  for (const phrase of ["Company Supervisor", "School Coordinator", "Company Representative", "server-recorded timestamps", "source of credited time", "Draft to Submitted", "People review AI drafts before use"]) assert.ok(source.includes(phrase), phrase);
  assert.doesNotMatch(source, /Clock.?In|Clock.?Out|Clocked|biometric|face recognition|liveness|buddy.punch|Supervisor.approved|Dean|HR role|Main Office|400|99\.4|25\+|Alyssa|USC|cryptographic|certification|support@|#login/i);
  assert.doesNotMatch(source, /approved timesheet|Work Log approval|automatic certificate/i);
});

test("sample records are explicitly illustrative and have no personal identity", () => {
  assert.match(preview, /Illustrative interface with sample records, not live internship data/);
  assert.match(preview, /Time In/);
  assert.match(preview, /Time Out/);
  assert.match(preview, /Timed in/);
  assert.match(preview, /Hours rendered/);
  assert.doesNotMatch(preview, /<button|<a |latitude|longitude|https?:|student number/i);
});

test("semantic structure and isolated responsive styles remain accessible", () => {
  assert.match(page, /<main id="landing-main" tabIndex=\{-1\}/);
  assert.match(source, /Skip to main content/);
  assert.match(sections, /aria-label="Public navigation"/);
  assert.match(preview, /<figcaption id="preview-caption"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.doesNotMatch(css, /overflow-x:\s*hidden|animation:|scroll-behavior:\s*smooth/);
});
