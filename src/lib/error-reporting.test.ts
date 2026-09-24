import { describe, expect, it } from "vitest";

import { scrubBreadcrumb, scrubEvent, withoutQuery } from "./error-reporting";

describe("error reporting", () => {
  it("drops query strings and fragments, which carry sign-in codes", () => {
    expect(withoutQuery("https://cracha-app.com/confirm?code=abc")).toBe("https://cracha-app.com/confirm");
    expect(withoutQuery("https://cracha-app.com/reset-password#access_token=x")).toBe("https://cracha-app.com/reset-password");
    expect(withoutQuery("/dashboard/chat")).toBe("/dashboard/chat");
  });

  it("scrubs the request of an event", () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: "https://cracha-app.com/auth/callback?code=secret", query_string: "code=secret", cookies: { sb: "x" } },
    });
    expect(event.request).toEqual({ url: "https://cracha-app.com/auth/callback" });
  });

  it("scrubs navigation and fetch breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "navigation", data: { from: "/confirm?code=a", to: "/dashboard" } }).data).toEqual({
      from: "/confirm",
      to: "/dashboard",
    });
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "/api/chat?x=1", status_code: 500 } }).data).toEqual({
      url: "/api/chat",
      status_code: 500,
    });
  });
});
