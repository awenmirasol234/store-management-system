import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { NotFoundPage } from "../src/pages/NotFoundPage.jsx";

describe("NotFoundPage rendering & behavior", function () {
  it("renders 404 badge, title, and descriptive message", function () {
    const html = renderToString(React.createElement(NotFoundPage));
    expect(html).toContain("404 Error");
    expect(html).toContain("Page Not Found");
    expect(html).toContain("The page or view you are looking for doesn&#x27;t exist");
  });

  it("renders Back to Dashboard and Open POS buttons for Owner", function () {
    const html = renderToString(
      React.createElement(NotFoundPage, {
        currentUser: { role: "OWNER" }
      })
    );
    expect(html).toContain("Back to Dashboard");
    expect(html).toContain("Open POS");
  });

  it("renders Back to POS button for Cashier", function () {
    const html = renderToString(
      React.createElement(NotFoundPage, {
        currentUser: { role: "CASHIER" }
      })
    );
    expect(html).toContain("Back to POS");
    expect(html).not.toContain("Back to Dashboard");
  });

  it("renders requested path when provided", function () {
    const html = renderToString(
      React.createElement(NotFoundPage, {
        requestedPath: "some/invalid/route"
      })
    );
    expect(html).toContain("Requested path:");
    expect(html).toContain("/some/invalid/route");
  });

  it("omits requested path when path is not-found", function () {
    const html = renderToString(
      React.createElement(NotFoundPage, {
        requestedPath: "not-found"
      })
    );
    expect(html).not.toContain("Requested path:");
  });
});
