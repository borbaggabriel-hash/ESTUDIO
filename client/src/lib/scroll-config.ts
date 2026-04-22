let initialized = false;

function getMagneticSections(): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      'section[id], [data-magnetic-section], main > section, [id="hub-dub"], [id="hubschool"], [id="hub-align"]'
    )
  );
  return nodes.filter((node) => node.offsetHeight > 120);
}

export function initMagneticScroll() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  let debounceTimer: number | null = null;
  let autoScrolling = false;
  let releaseTimer: number | null = null;

  const releaseAutoScroll = () => {
    if (releaseTimer) window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      autoScrolling = false;
    }, 420);
  };

  const snapToNearest = () => {
    if (autoScrolling) return;
    const sections = getMagneticSections();
    if (!sections.length) return;

    const viewportCenter = window.scrollY + window.innerHeight / 2;
    let nearest = sections[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const section of sections) {
      const sectionCenter = section.offsetTop + section.offsetHeight / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearest = section;
        nearestDistance = distance;
      }
    }

    const maxSnapDistance = Math.min(window.innerHeight * 0.6, 520);
    if (nearestDistance > maxSnapDistance) return;

    const target = nearest.offsetTop - (window.innerHeight - nearest.offsetHeight) / 2;
    const clampedTarget = Math.max(0, target);
    const delta = Math.abs(window.scrollY - clampedTarget);
    if (delta < 12) return;

    autoScrolling = true;
    window.scrollTo({ top: clampedTarget, behavior: "smooth" });
    releaseAutoScroll();
  };

  const onScroll = () => {
    if (autoScrolling) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(snapToNearest, 140);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", releaseAutoScroll, { passive: true });
  window.addEventListener("touchmove", releaseAutoScroll, { passive: true });
}
