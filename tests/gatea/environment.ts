export function assertGateAExecutionEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.GATEA_EXECUTION_APPROVED !== "1") {
    throw new Error("Gate A browser execution is not approved. Gate E5 approval is required.");
  }
  if (environment.GATEA_ENVIRONMENT_VERIFIED !== "1") {
    throw new Error("Gate A environment isolation has not been verified. Complete Gate E2 before browser execution.");
  }
  if (environment.GATEA_TARGET_ENV !== "test") {
    throw new Error("Gate A browser execution requires GATEA_TARGET_ENV=test.");
  }
  if (!environment.GATEA_RUN_ID?.trim()) {
    throw new Error("Gate A browser execution requires a non-empty GATEA_RUN_ID.");
  }
  if (!environment.GATEA_BASE_URL?.trim()) {
    throw new Error("Gate A browser execution requires GATEA_BASE_URL.");
  }
}
