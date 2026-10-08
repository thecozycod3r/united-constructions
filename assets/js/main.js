// United Constructions — progressive enhancement only. Every page works without this file.
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Page-load state (hero zoom + headline rise).
  requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add("is-loaded")));

  // Lazy images fade in over their dominant colour once decoded.
  document.querySelectorAll("img.lz").forEach((img) => {
    const done = () => img.classList.add("ld");
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  });

  // Split headlines into words for the staggered rise.
  document.querySelectorAll("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement("span"); w.className = "w";
            const s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  });

  // Scroll reveals.
  const revealables = document.querySelectorAll("[data-reveal], [data-split]");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  } else revealables.forEach((el) => el.classList.add("in"));

  // Header: solid after scrolling, hides on scroll down, returns on scroll up.
  const header = document.querySelector(".header");
  const dock = document.querySelector(".dock");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle("is-solid", y > 40);
    if (!document.body.classList.contains("menu-open")) header.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove("is-hidden");
    if (dock) dock.classList.toggle("is-shown", y > innerHeight * 0.6);
    lastY = y; ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  // Mobile menu.
  const menuBtn = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    menu.inert = !open;
    if (open) header.classList.remove("is-hidden");
  };
  if (menuBtn && menu) {
    menu.inert = true;
    menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    matchMedia("(min-width: 1080px)").addEventListener("change", (m) => m.matches && setMenu(false));
  }

  // Count-up numbers.
  const nums = document.querySelectorAll("[data-count]");
  if (nums.length && !reduced && "IntersectionObserver" in window) {
    const fmt = (n, el) => (el.dataset.fmt === "in" ? n.toLocaleString("en-IN") : String(n));
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, end = +el.dataset.count, start = +(el.dataset.from || 0), t0 = performance.now(), dur = 1600;
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4);
          el.textContent = fmt(Math.round(start + (end - start) * k), el);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step); cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => { el.textContent = fmt(+(el.dataset.from || 0), el); cio.observe(el); });
  }

  // Timeline scrubber: vertical scroll drives horizontal track (desktop only).
  const tl = document.querySelector(".tl");
  if (tl) {
    const track = tl.querySelector(".tl-track");
    const bar = tl.querySelector(".tl-progress");
    const yearOut = tl.querySelector(".tl-progress span");
    const years = [...tl.querySelectorAll(".tl-year")];
    const mq = matchMedia("(min-width: 900px)");
    let dist = 0;
    const measure = () => {
      if (!mq.matches || reduced) { document.body.classList.add("tl-static"); tl.style.removeProperty("--tl-h"); track.style.transform = ""; return; }
      document.body.classList.remove("tl-static");
      dist = Math.max(0, track.scrollWidth - innerWidth);
      tl.style.setProperty("--tl-h", `${innerHeight + dist}px`);
      update();
    };
    const update = () => {
      if (!mq.matches || reduced) return;
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight || 1)));
      track.style.transform = `translate3d(${-dist * p}px,0,0)`;
      bar.style.setProperty("--p", p.toFixed(4));
      const idx = Math.min(years.length - 1, Math.round(p * (years.length - 1)));
      if (yearOut) yearOut.textContent = years[idx]?.textContent || "";
    };
    addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    addEventListener("load", measure);
    measure();
  }

  // Work filters.
  const filters = document.querySelectorAll(".filter");
  if (filters.length) {
    const cards = document.querySelectorAll("[data-kind]");
    const apply = (k) => {
      filters.forEach((f) => f.setAttribute("aria-pressed", f.dataset.filter === k));
      cards.forEach((c) => {
        const show = k === "all" || c.dataset.kind === k;
        c.classList.toggle("is-out", !show);
        c.classList.remove("is-in");
        if (show && !reduced) { void c.offsetWidth; c.classList.add("is-in"); }
      });
      const url = new URL(location); k === "all" ? url.searchParams.delete("type") : url.searchParams.set("type", k);
      history.replaceState(null, "", url);
    };
    filters.forEach((f) => f.addEventListener("click", () => apply(f.dataset.filter)));
    const initial = new URLSearchParams(location.search).get("type");
    if (initial && document.querySelector(`.filter[data-filter="${CSS.escape(initial)}"]`)) apply(initial);
  }

  // Testimonial arrows.
  const qs = document.querySelector(".quotes");
  document.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
    const card = qs.querySelector(".quote");
    qs.scrollBy({ left: (card.offsetWidth + 16) * +b.dataset.q, behavior: reduced ? "auto" : "smooth" });
  }));

  // Gallery lightbox.
  const lb = document.querySelector(".lb");
  const shots = [...document.querySelectorAll("[data-full]")];
  if (lb && shots.length) {
    const img = lb.querySelector("img"), count = lb.querySelector(".lb-count");
    let i = 0, opener = null;
    const show = (n) => {
      i = (n + shots.length) % shots.length;
      img.src = shots[i].dataset.full; img.alt = shots[i].querySelector("img")?.alt || "";
      count.textContent = `${i + 1} / ${shots.length}`;
    };
    const open = (n, el) => { opener = el; show(n); lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; lb.querySelector(".lb-close").focus(); };
    const close = () => { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; opener?.focus(); };
    shots.forEach((s, n) => s.addEventListener("click", () => open(n, s)));
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => show(i - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(i + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  // Enquiry form -> WhatsApp (no backend yet). Falls back to email if WhatsApp is blocked.
  const form = document.querySelector("#enquiry");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form), err = form.querySelector(".form-error");
      const name = (d.get("name") || "").trim(), phone = (d.get("phone") || "").trim();
      if (!name || !/^[+\d][\d\s-]{7,}$/.test(phone)) { err.textContent = "Please add your name and a phone number we can call."; return; }
      err.textContent = "";
      const lines = [
        "Hello United Constructions, I'd like to discuss a project.",
        `Name: ${name}`, `Phone: ${phone}`,
        d.get("type") && `Project: ${d.get("type")}`,
        d.get("location") && `Location: ${d.get("location")}`,
        d.get("size") && `Plot / area: ${d.get("size")}`,
        d.get("when") && `Timeline: ${d.get("when")}`,
        d.get("message") && `Notes: ${d.get("message")}`,
      ].filter(Boolean).join("\n");
      const wa = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lines)}`;
      // "noopener" in the features string makes window.open return null, so clear opener by hand.
      const w = window.open(wa, "_blank");
      if (w) w.opener = null;
      else location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent("Project enquiry: " + name)}&body=${encodeURIComponent(lines)}`;
      form.querySelector(".form-ok").hidden = false;
    });
  }

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
