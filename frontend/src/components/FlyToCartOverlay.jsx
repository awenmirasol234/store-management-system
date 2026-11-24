import { useEffect, useState } from "react";
import { ProductThumb } from "./ProductThumb.jsx";

export function FlyToCartOverlay(props) {
  const activeFlyer = props.activeFlyer;
  const onComplete = props.onComplete;
  const [animating, setAnimating] = useState(false);

  useEffect(
    function startFlight() {
      if (!activeFlyer) {
        setAnimating(false);
        return;
      }

      // Check prefers-reduced-motion
      let prefersReducedMotion = false;
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (motionQuery && motionQuery.matches) {
          prefersReducedMotion = true;
        }
      }

      if (prefersReducedMotion) {
        if (typeof onComplete === "function") {
          onComplete(activeFlyer.id);
        }
        return;
      }

      // Trigger animation on next frame
      setAnimating(false);
      let rafId1 = null;
      let rafId2 = null;
      let timeoutId = null;

      rafId1 = window.requestAnimationFrame(function () {
        rafId2 = window.requestAnimationFrame(function () {
          setAnimating(true);
        });
      });

      let duration = 650;
      if (activeFlyer.duration) {
        duration = activeFlyer.duration;
      }
      timeoutId = window.setTimeout(function () {
        if (typeof onComplete === "function") {
          onComplete(activeFlyer.id);
        }
      }, duration + 30);

      return function cleanup() {
        if (rafId1 !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(rafId1);
        }
        if (rafId2 !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(rafId2);
        }
        if (timeoutId !== null && typeof window !== "undefined") {
          window.clearTimeout(timeoutId);
        }
      };
    },
    [activeFlyer, onComplete]
  );

  if (!activeFlyer) {
    return null;
  }

  let duration = 650;
  if (activeFlyer.duration) {
    duration = activeFlyer.duration;
  }

  let startX = 100;
  let startY = 100;
  if (activeFlyer.fromRect) {
    startX = activeFlyer.fromRect.left;
    startY = activeFlyer.fromRect.top;
  }

  let endX = 800;
  let endY = 80;
  if (typeof window !== "undefined") {
    endX = window.innerWidth - 80;
  }
  if (activeFlyer.toRect) {
    endX = activeFlyer.toRect.left;
    endY = activeFlyer.toRect.top;
  }

  let currentTransform = "translate3d(" + String(startX) + "px, " + String(startY) + "px, 0px) scale(1)";
  let currentOpacity = 0.95;

  if (animating) {
    currentTransform = "translate3d(" + String(endX) + "px, " + String(endY) + "px, 0px) scale(0.35)";
    currentOpacity = 0.1;
  }

  const flyerStyle = {
    position: "fixed",
    left: 0,
    top: 0,
    width: "44px",
    height: "44px",
    transform: currentTransform,
    opacity: currentOpacity,
    transitionProperty: "transform, opacity",
    transitionDuration: String(duration) + "ms",
    transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    willChange: "transform, opacity"
  };

  let productImageUrl = null;
  let productName = "";
  if (activeFlyer.product) {
    productImageUrl = activeFlyer.product.image_url;
    productName = activeFlyer.product.product_name;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <div
        style={flyerStyle}
        className="flex items-center justify-center rounded-xl border border-[#171717]/15 bg-white p-0.5 shadow-md shadow-[#171717]/10 select-none overflow-hidden"
      >
        <ProductThumb
          imageUrl={productImageUrl}
          name={productName}
          size="sm"
        />
      </div>
    </div>
  );
}
