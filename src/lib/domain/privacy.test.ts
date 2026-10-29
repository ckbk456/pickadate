import { describe, expect, it } from "vitest";
import { digestBearerToken, isUuidV4, redactPrivatePath } from "./privacy";

describe("private invitation identifiers", () => {
  it("accepts only UUIDv4 bearer credentials", () => {
    expect(isUuidV4("36b8f84d-df4e-4d49-b662-bcde71a8764f")).toBe(true);
    expect(isUuidV4("36b8f84d-df4e-1d49-b662-bcde71a8764f")).toBe(false);
    expect(isUuidV4("not-a-token")).toBe(false);
  });

  it("generates deterministic, non-plaintext digests", async () => {
    const token = "36b8f84d-df4e-4d49-b662-bcde71a8764f";
    const first = await digestBearerToken(token);
    const second = await digestBearerToken(token);

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toContain(token);
  });

  it("redacts full invitation paths", () => {
    expect(
      redactPrivatePath(
        "GET /i/36b8f84d-df4e-4d49-b662-bcde71a8764f/linh-cuoi-tuan",
      ),
    ).toBe("GET /i/[redacted]");
  });
});
