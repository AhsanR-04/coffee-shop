/* ============================================
   Open Coffee — interactions
   Progressive enhancement: everything degrades
   gracefully if this file fails to load.
   ============================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Current year ---------- */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Header state on scroll ---------- */
  const header = $("[data-header]");
  const onScrollHeader = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Mobile navigation ---------- */
  const navToggle = $("[data-nav-toggle]");
  const nav = $("#nav");

  if (navToggle && nav) {
    const setOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };

    navToggle.addEventListener("click", () => {
      setOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });

    // Close after choosing a destination.
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });

    // Escape closes; clicking outside the panel closes.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        navToggle.focus();
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealItems = $$(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Parallax: hero image + floating beans ---------- */
  const parallaxItems = $$("[data-parallax]");

  if (parallaxItems.length && !reduceMotion) {
    let ticking = false;

    const apply = () => {
      const y = window.scrollY;
      parallaxItems.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(apply);
        }
      },
      { passive: true }
    );
    apply();
  }

  /* ---------- Menu filters ---------- */
  const filterBar = $("[data-filters]");
  const menuGrid = $("[data-menu-grid]");

  if (filterBar && menuGrid) {
    const items = $$(".menu-item", menuGrid);
    const buttons = $$("[data-filter]", filterBar);

    const filterItems = (category, animate) => {
      let shown = 0;
      items.forEach((item) => {
        const match = category === "all" || item.dataset.category === category;
        item.hidden = !match;
        if (match) {
          shown += 1;
          if (animate && !reduceMotion) {
            item.classList.remove("is-entering");
            // Force reflow so the animation restarts on repeat filtering.
            void item.offsetWidth;
            item.style.animationDelay = `${Math.min(shown - 1, 8) * 45}ms`;
            item.classList.add("is-entering");
          }
        }
      });

      // Announce the state so keyboard and screen-reader users get feedback.
      const live = $("[data-menu-live]");
      if (live) {
        const label = buttons.find((b) => b.dataset.filter === category)?.textContent.trim() || category;
        live.textContent = `${shown} ${shown === 1 ? "item" : "items"} shown · ${label}`;
      }
    };

    const select = (button) => {
      buttons.forEach((b) => b.setAttribute("aria-selected", String(b === button)));
      filterItems(button.dataset.filter, true);
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => select(button));

      // Roving arrow-key support for the tablist pattern.
      button.addEventListener("keydown", (e) => {
        const index = buttons.indexOf(button);
        let next = null;
        if (e.key === "ArrowRight") next = buttons[(index + 1) % buttons.length];
        if (e.key === "ArrowLeft") next = buttons[(index - 1 + buttons.length) % buttons.length];
        if (!next) return;
        e.preventDefault();
        next.focus();
        select(next);
      });
    });
  }

  /* ---------- Opening hours: today row + open/closed status ---------- */
  // 0 = Sunday … 6 = Saturday, matching the table's data-day attributes.
  const schedule = {
    0: [8 * 60, 15 * 60],
    1: [7 * 60, 17 * 60],
    2: [7 * 60, 17 * 60],
    3: [7 * 60, 17 * 60],
    4: [7 * 60, 18 * 60],
    5: [7 * 60, 18 * 60],
    6: [8 * 60, 18 * 60],
  };

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h >= 12 ? "pm" : "am";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
  };

  const now = new Date();
  const today = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [openAt, closeAt] = schedule[today];

  // Highlight today in the hours table.
  const todayRow = $(`[data-hours] tr[data-day="${today}"]`);
  if (todayRow) {
    todayRow.classList.add("is-today");
    // Keep the highlight truthful when we are outside opening hours.
    if (minutesNow < openAt || minutesNow >= closeAt) todayRow.classList.add("is-closed");
  }

  const status = $("[data-status]");
  const statusText = $("[data-status-text]");

  if (status && statusText) {
    let message;
    if (minutesNow >= openAt && minutesNow < closeAt) {
      status.classList.add("is-open");
      message = `Open now · until ${formatTime(closeAt)}`;
    } else if (minutesNow < openAt) {
      status.classList.add("is-closed");
      message = `Closed · opens today at ${formatTime(openAt)}`;
    } else {
      const nextDay = (today + 1) % 7;
      status.classList.add("is-closed");
      message =
        schedule[nextDay][0] < 60
          ? `Closed for today`
          : `Closed · opens ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][nextDay]} at ${formatTime(schedule[nextDay][0])}`;
    }
    statusText.textContent = message;
    status.hidden = false;
  }

  /* ---------- Pointer-follow light on cards ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    const glowTargets = $$(".card, .visit-card, .testimonial");
    glowTargets.forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- Testimonials ---------- */
  const slider = $("[data-slider]");
  if (slider) {
    const slides = $$(".testimonial", slider);
    const dotsWrap = $("[data-slider-dots]");
    let index = 0;
    let timer = null;

    const show = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });
      if (dotsWrap) {
        $$("button", dotsWrap).forEach((dot, i) => {
          dot.setAttribute("aria-selected", String(i === index));
        });
      }
    };

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Go to quote ${i + 1}`);
        dot.addEventListener("click", () => {
          show(i);
          restart();
        });
        dotsWrap.appendChild(dot);
      });
    }

    const next = () => show(index + 1);
    const restart = () => {
      if (timer) clearInterval(timer);
      if (!reduceMotion) timer = setInterval(next, 6500);
    };

    $("#slider-next")?.addEventListener("click", () => {
      next();
      restart();
    });
    $("#slider-prev")?.addEventListener("click", () => {
      show(index - 1);
      restart();
    });

    show(0);
    restart();

    // Pause auto-advance while the user is reading or hovering.
    slider.addEventListener("pointerenter", () => timer && clearInterval(timer));
    slider.addEventListener("pointerleave", restart);
    slider.addEventListener("focusin", () => timer && clearInterval(timer));
    slider.addEventListener("focusout", restart);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) restart();
            else if (timer) clearInterval(timer);
          });
        },
        { threshold: 0.2 }
      ).observe(slider);
    }
  }

  /* ---------- Scroll progress bar ---------- */
  const progress = $("[data-progress]");
  if (progress) {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }
})();
