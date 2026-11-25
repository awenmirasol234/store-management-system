// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Modal } from "../src/components/Modal.jsx";

describe("Modal entrance & exit animation lifecycle", function () {
  let container = null;
  let root = null;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(async function () {
    if (root) {
      await act(async function () {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("applies scale-up and fade-in entry animation classes when open", async function () {
    await act(async function () {
      root.render(
        React.createElement(
          Modal,
          {
            open: true,
            title: "Quick Stock In",
            onClose: function () {}
          },
          React.createElement("input", { id: "test-input", defaultValue: "Quick Item" })
        )
      );
    });

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const backdrop = dialog.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    expect(backdrop.className).toContain("modal-backdrop-animate-in");
    expect(backdrop.className).toContain("backdrop-blur-[2px]");

    const card = dialog.querySelector(".modal-panel-animate-in");
    expect(card).not.toBeNull();
    expect(card.className).toContain("rounded-2xl");
    expect(card.className).toContain("bg-white");

    const input = container.querySelector("#test-input");
    expect(input).not.toBeNull();
    expect(input.value).toBe("Quick Item");
  });

  it("applies exit animation classes and delays unmount for 150ms when closed", async function () {
    function TestHost() {
      const [isOpen, setIsOpen] = useState(true);

      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          {
            id: "close-trigger",
            onClick: function () {
              setIsOpen(false);
            }
          },
          "Close Modal"
        ),
        React.createElement(
          Modal,
          {
            open: isOpen,
            title: "Quick Checkout",
            onClose: function () {
              setIsOpen(false);
            }
          },
          React.createElement("p", null, "Checkout Content")
        )
      );
    }

    await act(async function () {
      root.render(React.createElement(TestHost));
    });

    expect(container.querySelector("dialog")).not.toBeNull();

    // Trigger close action
    const closeTrigger = container.querySelector("#close-trigger");
    await act(async function () {
      closeTrigger.click();
    });

    // During the 150ms exit window, modal remains mounted with exit classes
    const dialogDuringExit = container.querySelector("dialog");
    expect(dialogDuringExit).not.toBeNull();
    expect(dialogDuringExit.className).toContain("pointer-events-none");

    const backdropDuringExit = dialogDuringExit.querySelector("[aria-hidden='true']");
    expect(backdropDuringExit).not.toBeNull();
    expect(backdropDuringExit.className).toContain("modal-backdrop-animate-out");

    const cardDuringExit = dialogDuringExit.querySelector(".modal-panel-animate-out");
    expect(cardDuringExit).not.toBeNull();
    expect(cardDuringExit.textContent).toContain("Checkout Content");

    // Fast-forward 100ms: still mounted in exit state
    await act(async function () {
      vi.advanceTimersByTime(100);
    });
    expect(container.querySelector("dialog")).not.toBeNull();

    // Fast-forward remaining 50ms (total 150ms): modal finishes unmounting
    await act(async function () {
      vi.advanceTimersByTime(50);
    });
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("preserves last rendered title and children during exit animation when parent resets data", async function () {
    function HostWithReset() {
      const [product, setProduct] = useState({ name: "Canned Tuna", price: "₱45.00" });

      function handleClose() {
        setProduct(null);
      }

      let isOpen = false;
      let modalTitle = "";
      let modalBody = null;
      if (product) {
        isOpen = true;
        modalTitle = "Product: " + product.name;
        modalBody = React.createElement("span", null, product.price);
      }

      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          {
            id: "reset-btn",
            onClick: handleClose
          },
          "Reset and Close"
        ),
        React.createElement(
          Modal,
          {
            open: isOpen,
            title: modalTitle,
            onClose: handleClose
          },
          modalBody
        )
      );
    }

    await act(async function () {
      root.render(React.createElement(HostWithReset));
    });

    expect(container.textContent).toContain("Product: Canned Tuna");
    expect(container.textContent).toContain("₱45.00");

    // Trigger close and data reset
    await act(async function () {
      container.querySelector("#reset-btn").click();
    });

    // Content should NOT be blank during exit; cached content must display
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector("h2").textContent).toBe("Product: Canned Tuna");
    expect(dialog.textContent).toContain("₱45.00");

    // Complete exit duration
    await act(async function () {
      vi.advanceTimersByTime(150);
    });
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("triggers onClose from backdrop click and Escape key", async function () {
    let closeCallCount = 0;

    await act(async function () {
      root.render(
        React.createElement(
          Modal,
          {
            open: true,
            title: "Test Modal",
            onClose: function () {
              closeCallCount += 1;
            }
          },
          React.createElement("button", { id: "inner-btn" }, "Inner Button")
        )
      );
    });

    const backdrop = container.querySelector("[aria-hidden='true']");
    await act(async function () {
      backdrop.click();
    });
    expect(closeCallCount).toBe(1);

    const dialog = container.querySelector("dialog");
    const cancelEvent = new Event("cancel", { cancelable: true });
    await act(async function () {
      dialog.dispatchEvent(cancelEvent);
    });
    expect(closeCallCount).toBe(2);
  });

  it("focuses modal controls on open and restores the opener on close", async function () {
    function Host() {
      const [isOpen, setIsOpen] = useState(false);
      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          {
            id: "open-trigger",
            onClick: function () {
              setIsOpen(true);
            }
          },
          "Open"
        ),
        React.createElement(
          Modal,
          {
            open: isOpen,
            title: "Focus Test",
            onClose: function () {
              setIsOpen(false);
            }
          },
          React.createElement("input", { id: "focus-input" })
        )
      );
    }

    await act(async function () {
      root.render(React.createElement(Host));
    });

    const opener = container.querySelector("#open-trigger");
    await act(async function () {
      opener.focus();
      opener.click();
    });
    expect(document.activeElement).toBe(container.querySelector("dialog button"));

    await act(async function () {
      container.querySelector("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    await act(async function () {
      vi.advanceTimersByTime(150);
    });
    expect(document.activeElement).toBe(opener);
  });

  it("exits immediately when prefers-reduced-motion is enabled", async function () {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(function (query) {
      let matches = false;
      if (query === "(prefers-reduced-motion: reduce)") {
        matches = true;
      }
      return {
        matches: matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };
    });

    function ReducedMotionHost() {
      const [isOpen, setIsOpen] = useState(true);

      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          {
            id: "close-instant",
            onClick: function () {
              setIsOpen(false);
            }
          },
          "Close"
        ),
        React.createElement(
          Modal,
          {
            open: isOpen,
            title: "Accessible Modal",
            onClose: function () {
              setIsOpen(false);
            }
          },
          React.createElement("p", null, "Instant exit")
        )
      );
    }

    await act(async function () {
      root.render(React.createElement(ReducedMotionHost));
    });
    expect(container.querySelector("dialog")).not.toBeNull();

    await act(async function () {
      container.querySelector("#close-instant").click();
    });

    // Reduced motion closes immediately without waiting 150ms
    expect(container.querySelector("dialog")).toBeNull();

    window.matchMedia = originalMatchMedia;
  });
});
