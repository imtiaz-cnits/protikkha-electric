"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isVisibleModalBackdrop(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const cls = typeof el.className === "string" ? el.className : "";
  const isBackdrop =
    (cls.includes("fixed") &&
      cls.includes("inset-0") &&
      (cls.includes("backdrop-blur") ||
        cls.includes("bg-slate-900/") ||
        cls.includes("bg-slate-950/") ||
        cls.includes("bg-black/"))) ||
    el.getAttribute("data-modal") === "true" ||
    el.getAttribute("role") === "dialog";

  if (!isBackdrop) return false;

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  return true;
}

export function ModalScrollLock() {
  const pathname = usePathname();

  useEffect(() => {
    let locked = false;

    const syncScrollLock = () => {
      const candidates = document.querySelectorAll(
        'div.fixed.inset-0, [role="dialog"], [data-modal="true"]'
      );
      let hasOpenModal = false;
      for (let i = 0; i < candidates.length; i++) {
        if (isVisibleModalBackdrop(candidates[i])) {
          hasOpenModal = true;
          break;
        }
      }

      const html = document.documentElement;
      const body = document.body;

      if (hasOpenModal && !locked) {
        const scrollbarWidth = window.innerWidth - html.clientWidth;
        if (scrollbarWidth > 0) {
          body.style.paddingRight = `${scrollbarWidth}px`;
        }
        html.classList.add("modal-scroll-locked");
        body.classList.add("modal-scroll-locked");
        locked = true;
      } else if (!hasOpenModal && locked) {
        html.classList.remove("modal-scroll-locked");
        body.classList.remove("modal-scroll-locked");
        body.style.paddingRight = "";
        locked = false;
      }
    };

    syncScrollLock();

    const observer = new MutationObserver(() => {
      syncScrollLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", syncScrollLock);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncScrollLock);
      document.documentElement.classList.remove("modal-scroll-locked");
      document.body.classList.remove("modal-scroll-locked");
      document.body.style.paddingRight = "";
    };
  }, [pathname]);

  return null;
}

