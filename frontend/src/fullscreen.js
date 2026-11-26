import { useEffect, useState } from "react";

// shortcut: browser fullscreen API used for kiosk POS mode, upgrade to Electron or native kiosk shell for locked-down retail terminals.
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(function () {
    if (typeof document === "undefined") {
      return false;
    }
    return Boolean(document.fullscreenElement);
  });

  useEffect(function bindFullscreen() {
    if (typeof document === "undefined") {
      return;
    }
    function updateState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", updateState);
    return function cleanup() {
      document.removeEventListener("fullscreenchange", updateState);
    };
  }, []);

  function toggleFullscreen() {
    if (typeof document === "undefined") {
      return;
    }
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement && typeof document.documentElement.requestFullscreen === "function") {
          document.documentElement.requestFullscreen().catch(function () {});
        }
      } else {
        if (typeof document.exitFullscreen === "function") {
          document.exitFullscreen().catch(function () {});
        }
      }
    } catch (error) {
      // Gracefully ignore unpermitted fullscreen requests
    }
  }

  return {
    isFullscreen: isFullscreen,
    toggleFullscreen: toggleFullscreen
  };
}
