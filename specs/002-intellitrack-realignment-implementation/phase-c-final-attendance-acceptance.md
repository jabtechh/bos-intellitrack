# Gate C — Final Attendance acceptance, single-run plan

**No new infrastructure gate.** Approved isolated test only: `local-supabase`, API `127.0.0.1:54321`, DB `127.0.0.1:54322`, app port `3100`. Never interact with the existing port 3000 tab. Gate D not authorized.

## Verified before physical-device testing
- Gate C.4 Storage running, three private buckets, baseline migration ledger unchanged.
- Gate C.5: real Work Log and Document upload/retrieval and cleanup passed; 48/51 Verified.
- Attendance focused tests `npx tsx --test scripts/test-attendance-foundation.ts scripts/test-attendance-capture-details.ts scripts/test-attendance-ux.ts scripts/test-attendance-corrections.ts`: **65/65 PASS**; lint/typecheck and protected E6 fixtures PASS.
- Browser-simulated GPS success, denied-permission fallback, and no-selfie fail-closed behavior previously verified. These are not physical-device tests.

## Server-action Attendance acceptance completed (2026-11-05)
- Expanded `tests/gatea/gate-c-lifecycle.spec.ts` with browser-based direct form-action submission of a synthetic PNG, explicitly bypassing *client-side* camera gating for backend-only test coverage. The synthetic Intern's real authenticated server action created a Time In record; one private PNG evidence object downloaded byte-identically. A second stale browser tab tried Time In again and was refused; only one record existed.
- A real Time Out server action persisted on the same record with a separate private evidence path; short shift correctly resulted in `PENDING_REVIEW` and **zero credited minutes**. Another stale Time Out tab was refused. Both objects, the Attendance record and all synthetic identities were deleted.
- The disposable browser lifecycle **PASS**; isolated regression **516 PASS**, lint and typecheck PASS, protected E6 fixtures PASS. Read-only post-test checks: zero Storage objects, no synthetic Attendance/Intern, migration ledger hash unchanged.
- **ATT-1 upgraded to Verified (server transaction behavior).** Browser-injected synthetic evidence does **not** certify physical GPS, live camera, face verification, or selfie freshness; the server's file-type/size checks alone cannot independently establish camera origin. **ATT-3 and ATT-5 remain Conditional.** An independent environment-isolation incident review is still required.
- Overall canonical status: **49 Verified / 2 Conditional**; Gate C BLOCKED, Gate D unauthorized.

## One physical-device acceptance session — ATT-3, ATT-5
1. **Prerequisite: secure Android device access.** Prefer USB-only `adb reverse` for **both** isolated app port `3100` and Supabase gateway port `54321`. This forwards the phone's loopback ports to the development PC and lets Android Chrome use the potentially trustworthy loopback origin `http://127.0.0.1:3100` for Geolocation and Camera permission prompts without public exposure. On Windows, install Google's official SDK Platform-Tools to `C:\Android\platform-tools` if ADB is unavailable; enable USB debugging on phone and approve the PC; from project root run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-android-usb-bridge.ps1`. This validates the isolated preflight and single authorized device and forwards **only** 3100/54321. The bridge helper has not been executed; ADB was not installed/detected in the current PC shell. Keep USB connected, use Android Chrome at `http://127.0.0.1:3100/login`. Do not open port 3000, expose test services publicly, switch to default env, or bypass browser secure-context requirements.
2. Provision **one disposable isolated Intern/Auth identity and assignment**, with explicit unique test marker and cleanup procedure. Do not change protected E6 accounts or assignments. Use real current dates for the assignment period; verify local office geofence location settings against permitted test coordinates without changing baseline company records.
3. **ATT-3:** On a physical phone, grant precise location access and confirm GPS latitude, longitude, accuracy and geofence classification. Test denial and retry separately. Log device/browser, location permission result, accuracy and expected geofence outcome (avoid saving precise personal location unnecessarily).
4. **ATT-5:** Grant camera access, capture a fresh selfie through the UI, confirm the face detection and photo-confirmation states, and verify the expected private Storage path. Do not claim biometric identity proof beyond image/face-presence checks.
5. **ATT-1:** Submit Time In on the disposable assignment, verify one `attendance` row with timestamps, GPS metadata, and an existing private selfie object. Repeat Time In attempt and verify no second row. Submit Time Out, verify second private selfie object, worked minutes, status/review behavior and no double Time Out. Review errors/edge cases using only this disposable account.
6. Check Intern versus unauthorized-role access and permitted Supervisor review scope. For invalid GPS/geofence/evidence, confirm review flags and zero credit where applicable.
7. Clean up ONLY disposable attendance rows, associated selfie objects, assignment/profile/user, and Auth identity. Verify zero synthetic residue and the original protected E6 fixture invariant, Storage migration ledger, and bucket privacy.
8. Record pass/fail evidence for ATT-1/3/5 and perform independent environment-isolation incident closure. Overall Gate C PASS requires both outcomes; Gate D requires separate authorization.

## Constraints
- Do not substitute simulated geolocation or an API-uploaded image for physical-device GPS/camera acceptance.
- No Production/default environment or port 3000, no deployment, migration, reset, commit or push.
- **Current status: 49/51 Verified / 2 Conditional (ATT-3, ATT-5); Gate C BLOCKED; Gate D not authorized.**
