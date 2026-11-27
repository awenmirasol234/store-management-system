import { useEffect, useState } from "react";

export function useDelayedSkeleton(isLoading) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(
    function delaySkeleton() {
      if (!isLoading) {
        setIsVisible(false);
        return;
      }

      const timerId = setTimeout(function showSkeleton() {
        setIsVisible(true);
      }, 150);

      return function cancelSkeletonTimer() {
        clearTimeout(timerId);
      };
    },
    [isLoading]
  );

  return isVisible;
}
