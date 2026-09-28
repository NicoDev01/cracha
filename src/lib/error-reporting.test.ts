import { describe, expect, it } from "vitest";

import { IGNORED_ERRORS, scrubBreadcrumb, scrubEvent, withoutQuery } from "./error-reporting";

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

  it("ignores the Outlook Safe Links scanner, not real errors", () => {
    const ignored = (message: string) => IGNORED_ERRORS.some((pattern) => pattern.test(message));
    expect(ignored("Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4")).toBe(true);
    expect(ignored("TypeError: Cannot read properties of undefined (reading 'update')")).toBe(false);
  });
});
