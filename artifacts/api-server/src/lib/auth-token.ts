export function createToken(employeeId: number): string {
  return Buffer.from(`employee:${employeeId}:${Date.now()}`).toString("base64url");
}

export function parseToken(token: string): { employeeId: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [prefix, id] = decoded.split(":");
    if (prefix !== "employee") return null;
    const employeeId = Number(id);
    if (!Number.isInteger(employeeId)) return null;
    return { employeeId };
  } catch {
    return null;
  }
}
