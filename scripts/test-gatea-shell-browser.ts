import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Gate A T105 source/fixture contract only.
 *
 * This does NOT render browser screenshots or claim visual acceptance.
 * The local headless Chrome/Edge invocation did not produce DOM output,
 * and the connected Auth/database environment is not a safe fixture target.
 */
const shell = readFileSync("src/components/app-shell.tsx", "utf8");
const mobile = readFileSync("src/components/mobile-navigation.tsx", "utf8");
const utilities = readFileSync("src/components/application-utilities.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const roles = ["internNav", "supervisorNav", "coordinatorNav", "representativeNav", "adminNav"];
const widths = [390, 768, 1024, 1440];

function items(name: string) {
  const declaration = shell.match(new RegExp("(?:export )?const " + name + ": ShellNavItem\\[\\] = \\[([\\s\\S]*?)\\n\\];"));
  assert(declaration, `Missing role navigation ${name}`);
  return [...declaration[1].matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
}

for (const role of roles) {
  for (const width of widths) {
    test(`T105 ${role} at ${width}px: source-level shell contract (NOT visual acceptance)`, () => {
      assert(items(role).length >= 2, "Each role needs navigation destinations");
      if (width < 1024) {
        assert.match(css, /@media \(max-width: 1023px\) \{[\s\S]*?\.app-sidebar \{ display: none; \}/);
        assert.match(css, /\.desktop-user-identity\{display:none/);
        assert.match(css, /@media \(max-width: 1023px\) \{[\s\S]*?\.bottom-nav \{ display: grid; \}/);
        assert(mobile.includes("const rest = items.filter"), "Secondary items remain in More");
      } else {
        assert.match(css, /@media \(min-width: 1024px\) \{[\s\S]*?\.app-sidebar \{ display: flex; \}/);
        assert.match(css, /@media\(min-width:1024px\)[\s\S]*\.desktop-user-identity\{display:grid/);
        assert(utilities.includes("desktop-user-identity"));
        assert.match(css, /\.app-sidebar nav \{ display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;/);
        assert.match(css, /\.app-sidebar > nav \{[^}]*overflow-y:auto/);
      }
      assert(!items(role).some((path) => path.startsWith("/attendance/review") && role !== "supervisorNav"));
      if (role === "adminNav") assert.deepEqual(items(role), ["/admin/system", "/admin/users"]);
    });
  }
}

test("T105 mobile and desktop behavior is viewport-based, not device-based", () => {
  assert.doesNotMatch(shell + mobile, /navigator\.userAgent|matchMedia|innerWidth|ontouchstart/);
  assert(mobile.includes("aria-modal=\"true\""));
});
