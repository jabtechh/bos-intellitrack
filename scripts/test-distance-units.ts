// Distances are stored in meters but shown and entered in kilometers.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatKm, kmInputToMeters, metersToKmInput } from "../src/lib/attendance/distance.ts";

test("meters are displayed in kilometers", () => {
  assert.equal(formatKm(100), "0.1 km");
  assert.equal(formatKm(250), "0.25 km");
  assert.equal(formatKm(2500), "2.5 km");
  assert.equal(formatKm(5), "< 0.01 km");
  assert.equal(formatKm(0), "0 km");
});

test("km form values convert to whole meters for storage and back", () => {
  assert.equal(kmInputToMeters("0.1"), "100");
  assert.equal(kmInputToMeters(" 1.25 "), "1250");
  assert.equal(kmInputToMeters(""), "");
  assert.equal(kmInputToMeters("abc"), "abc", "invalid input is left for validation to reject");
  assert.equal(metersToKmInput(100), "0.1");
  assert.equal(metersToKmInput(null), "");
});

test("forms and evidence use km labels, not meters", () => {
  const office = readFileSync("src/app/admin/settings/office/page.tsx", "utf8"), branch = readFileSync("src/app/admin/branches/branch-form.tsx", "utf8");
  for (const source of [office, branch]) { assert.match(source, /Geofence radius \(km/); assert.doesNotMatch(source, /radius \(meters\)/); }
  assert.match(readFileSync("src/app/admin/settings/office/actions.ts", "utf8"), /kmInputToMeters\(formData\.get\("geofenceRadiusKm"\)\)/);
  assert.match(readFileSync("src/app/admin/branches/actions.ts", "utf8"), /kmInputToMeters\(form\.get\("geofenceRadiusKm"\)\)/);
  assert.match(readFileSync("src/components/branch-location-evidence.tsx", "utf8"), /formatKm\(distance\)/);
});
