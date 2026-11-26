"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams.toString()}`;

  const [navigatingFrom, setNavigatingFrom] = React.useState<string | null>(
    null
  );
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      try {
        const destUrl = new URL(anchor.href, window.location.href);
        if (destUrl.origin !== window.location.origin) return;

        const destKey = `${destUrl.pathname}?${destUrl.searchParams.toString()}`;
        const activeKey = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;
        if (destKey === activeKey) return;

        setNavigatingFrom(activeKey);
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          setNavigatingFrom(null);
        }, 8000);
      } catch {
        // Ignora URLs malformadas
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isNavigating =
    navigatingFrom !== null && navigatingFrom === currentKey;

  if (!isNavigating) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 inset-x-0 z-[100] h-[3px] overflow-hidden bg-primary/20 pointer-events-none"
    >
      <div
        className="h-full w-full bg-fire-gradient origin-left"
        style={{ animation: "oba-nav-progress 1.1s ease-in-out infinite" }}
      />
    </div>
  );
}
