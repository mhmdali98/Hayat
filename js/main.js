/* ═══════════════════════════════════════════════════════════
   HAYAT — الحيَـاة | Interaction & animation engine
   Vanilla JS only: zero dependencies, fully self-contained.
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────── PRELOADER ─────────── */
  const preloader = $("#preloader");
  const bootReveals = () => {
    initReveals();
    document.body.classList.add("ready");
  };
  const closePreloader = () => {
    preloader.classList.add("done");
    setTimeout(() => {
      preloader.classList.add("gone");
      bootReveals();
    }, 950);
  };
  if (reduceMotion) {
    preloader.classList.add("gone");
    bootReveals();
  } else {
    // minimum 1.9s of branding, or when the page is fully loaded — whichever is later
    const minDelay = new Promise(r => setTimeout(r, 1900));
    const loaded  = new Promise(r => (document.readyState === "complete" ? r() : addEventListener("load", r)));
    Promise.all([minDelay, loaded]).then(closePreloader);
    setTimeout(closePreloader, 4500); // hard fallback
  }

  /* ─────────── SKY STATE (dawn → dusk → night) ─────────── */
  const skySections = $$("[data-sky]");
  const setSky = state => {
    if (document.body.dataset.sky !== state) document.body.dataset.sky = state;
  };
  setSky("dawn");
  const skyIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) setSky(e.target.dataset.sky);
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  skySections.forEach(s => skyIO.observe(s));

  /* ─────────── STARS CANVAS ─────────── */
  const canvas = $("#stars");
  const ctx = canvas.getContext("2d");
  let stars = [];
  const buildStars = () => {
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
    const count = Math.min(190, Math.floor(innerWidth / 7));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + .3,
      p: Math.random() * Math.PI * 2,   // twinkle phase
      s: Math.random() * 1.6 + .6       // twinkle speed
    }));
  };
  buildStars();
  addEventListener("resize", buildStars);
  if (!reduceMotion) {
    const drawStars = t => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#F5F8FF";
      for (const st of stars) {
        const a = .25 + .65 * Math.abs(Math.sin(st.p + t / 1000 * st.s));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 7);
        ctx.fill();
      }
      requestAnimationFrame(drawStars);
    };
    requestAnimationFrame(drawStars);
  } else {
    ctx.fillStyle = "rgba(245,248,255,.7)";
    stars.forEach(st => { ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill(); });
  }

  /* ─────────── REVEAL ON SCROLL ─────────── */
  function initReveals() {
    const els = $$(".reveal");
    if (reduceMotion) { els.forEach(el => el.classList.add("in-view")); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(el => io.observe(el));
  }

  /* ─────────── ROUTE PLANE (follows the dashed path on scroll) ─────────── */
  const routeSection = $("#route");
  const routeLine = $("#routeLine");
  const routePlane = $("#routePlane");
  let pathLen = 0;
  if (routeLine && routePlane) {
    pathLen = routeLine.getTotalLength();
    routePlane.style.left = "0";
    routePlane.style.right = "auto";
    routePlane.style.top = "0";
  }
  function updateRoutePlane() {
    if (!routeLine || !routePlane || reduceMotion) return;
    const svg = routeLine.ownerSVGElement;
    if (getComputedStyle(svg).display === "none") return;
    const rect = routeSection.getBoundingClientRect();
    // progress: 0 as the section enters the viewport → 1 as it scrolls past
    const total = rect.height + innerHeight * .6;
    const passed = innerHeight * .85 - rect.top;
    const prog = Math.max(0, Math.min(1, passed / total));
    const pt = routeLine.getPointAtLength(prog * pathLen);
    const ahead = routeLine.getPointAtLength(Math.min(pathLen, prog * pathLen + 2));
    const svgRect = svg.getBoundingClientRect();
    const x = (pt.x / 1000) * svgRect.width - 15;
    const y = (pt.y / 160) * svgRect.height - 30 - 15; // svg sits at top:-30, center the 30px plane
    const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
    routePlane.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(angle + 90).toFixed(1)}deg)`;
  }

  /* ─────────── NAVBAR ─────────── */
  const nav = $("#navbar");
  const toTop = $("#toTop");
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 30);
    toTop.classList.toggle("show", y > innerHeight * 1.2);
    document.body.classList.toggle("flying", y > innerHeight * .45);
    // flight rail progress
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? (y / max) * 100 : 0;
    document.querySelector(".rail-track")?.style.setProperty("--p", p.toFixed(2) + "%");
    updateRoutePlane();
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* active nav link */
  const navLinks = $$(".nav-link");
  const linkFor = id => navLinks.find(a => a.getAttribute("href") === "#" + id);
  const activeIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const link = linkFor(e.target.id);
      if (link) { navLinks.forEach(a => a.classList.remove("is-active")); link.classList.add("is-active"); }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["hero","about","services","destinations","journey","contact"].forEach(id => {
    const el = document.getElementById(id);
    if (el) activeIO.observe(el);
  });

  /* ─────────── MOBILE MENU ─────────── */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  const toggleMenu = force => {
    const open = force ?? !mobileMenu.classList.contains("open");
    mobileMenu.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleMenu());
  $$(".mm-link, .mm-cta", mobileMenu).forEach(a => a.addEventListener("click", () => toggleMenu(false)));

  /* ─────────── LANGUAGE TOGGLE (AR ⇄ EN) ─────────── */
  const langBtn = $("#langBtn");
  const applyLang = lang => {
    const isEN = lang === "en";
    document.documentElement.lang = isEN ? "en" : "ar";
    document.documentElement.dir  = isEN ? "ltr" : "rtl";
    langBtn.textContent = isEN ? "عربي" : "EN";
    $$("[data-ar][data-en]").forEach(el => {
      el.innerHTML = isEN ? el.dataset.en : el.dataset.ar;
    });
    $$("[data-ar-ph][data-en-ph]").forEach(el => {
      el.placeholder = isEN ? el.dataset.enPh : el.dataset.arPh;
    });
    document.title = isEN
      ? "Hayat | Travel & Tourism — Your journey starts here"
      : "الحيَـاة | Hayat Travel & Tourism — رحلتك تبدأ من هنا";
    localStorage.setItem("hayat-lang", lang);
  };
  langBtn.addEventListener("click", () => {
    applyLang(document.documentElement.lang === "ar" ? "en" : "ar");
  });
  const savedLang = localStorage.getItem("hayat-lang");
  if (savedLang === "en") applyLang("en");

  /* ─────────── SEARCH WIDGET (ticket card) ─────────── */
  const searchCard = $("#searchCard");
  if (searchCard) {
    const tabs = $$(".stab", searchCard);
    const panels = $$(".spanel", searchCard);

    const activateTab = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(p => p.classList.toggle("is-active", p.id === "panel-" + tab.dataset.panel));
    };
    tabs.forEach(tab => tab.addEventListener("click", () => activateTab(tab)));
    $(".search-tabs", searchCard).addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = document.documentElement.dir === "rtl";
      const delta = (e.key === "ArrowRight") !== rtl ? 1 : -1;
      const next = tabs[(i + delta + tabs.length) % tabs.length];
      next.focus();
      activateTab(next);
    });

    /* swap from ⇄ to */
    const fromInput = $("#ffFrom"), toInput = $("#ffTo"), swapBtn = $("#swapBtn");
    let swapTurns = 0;
    swapBtn?.addEventListener("click", () => {
      [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
      swapBtn.style.transform = `rotate(${++swapTurns * 180}deg)`;
    });

    /* dates: sensible defaults, no past days, return always after departure */
    const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
    const today = plusDays(0);
    $$('input[type="date"]', searchCard).forEach(i => (i.min = today));
    const linkDates = (aSel, bSel, d1, d2) => {
      const a = $(aSel), b = $(bSel);
      if (!a || !b) return;
      a.value = plusDays(d1); b.value = plusDays(d2); b.min = a.value;
      a.addEventListener("change", () => {
        b.min = a.value || today;
        if (b.value && b.value < b.min) b.value = b.min;
      });
    };
    linkDates("#ffDepart", "#ffReturn", 7, 11);
    linkDates("#fhIn", "#fhOut", 7, 11);

    /* one-way trips don't need a return date */
    const returnInput = $("#ffReturn");
    const returnField = $("#ffReturnField");
    $$('input[name="trip"]', searchCard).forEach(r => r.addEventListener("change", () => {
      const oneway = searchCard.querySelector('input[name="trip"]:checked').value === "oneway";
      returnField.classList.toggle("is-off", oneway);
      returnInput.disabled = oneway;
    }));

    /* clear the error highlight as soon as the user fixes the field */
    searchCard.addEventListener("input", e => e.target.closest(".sfield")?.classList.remove("err"));
  }

  /* ─────────── FORMS → TOAST ─────────── */
  const toast = $("#toast");
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  };
  const submitMsg = () => document.documentElement.lang === "en"
    ? "Thank you! Hayat's team will contact you shortly ✈️"
    : "شكراً لك! فريق الحياة سيتواصل معك قريباً ✈️";
  $("#contactForm")?.addEventListener("submit", e => { e.preventDefault(); showToast(submitMsg()); e.target.reset(); });

  /* search form: validate the active panel, fake a short search, then confirm */
  const searchMsgs = {
    flights: [
      v => `أفضل الرحلات نحو «${v}» في طريقها إليك — فريق الحياة سيتواصل معك قريباً ✈️`,
      v => `Our best flights to “${v}” are on their way — Hayat's team will reach out soon ✈️`
    ],
    hotels: [
      v => `نجهّز لك أرقى الفنادق في «${v}» — توقّع اتصالنا قريباً 🏨`,
      v => `Handpicking the finest hotels in “${v}” — expect our call soon 🏨`
    ],
    packages: [
      v => `باقات «${v}» بانتظارك — سنشاركك كل التفاصيل قريباً 🧳`,
      v => `“${v}” packages await — we'll share all the details soon 🧳`
    ],
    visas: [
      v => `استلمنا طلب تأشيرة «${v}» — سنرافقك خطوة بخطوة حتى ختم الجواز 🛂`,
      v => `Your “${v}” visa request is in — we'll guide you to that passport stamp 🛂`
    ]
  };
  $("#searchForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const panel = $(".spanel.is-active", searchCard);
    const req = $("[data-req]", panel);
    const val = !req ? ""
      : req.tagName === "SELECT"
        ? (req.value ? req.selectedOptions[0].textContent.trim() : "")
        : req.value.trim();
    if (req && !val) {
      const field = req.closest(".sfield");
      field.classList.remove("err");
      void field.offsetWidth; // restart the shake animation
      field.classList.add("err");
      req.focus();
      return;
    }
    const btn = $(".search-btn", panel);
    if (btn.classList.contains("is-loading")) return;
    btn.classList.add("is-loading");
    setTimeout(() => {
      btn.classList.remove("is-loading");
      const [ar, en] = searchMsgs[panel.id.replace("panel-", "")];
      showToast(document.documentElement.lang === "en" ? en(val) : ar(val));
    }, reduceMotion ? 60 : 1300);
  });

  /* ─────────── COUNTERS ─────────── */
  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      counterIO.unobserve(el);
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1600, t0 = performance.now();
      const tick = now => {
        const k = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$(".counter").forEach(c => counterIO.observe(c));

  /* ─────────── SERVICE CARD GLOW ─────────── */
  if (matchMedia("(hover:hover)").matches) {
    $$(".service-card").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* ─────────── 3D TILT ON DESTINATION CARDS ─────────── */
  if (matchMedia("(hover:hover)").matches && !reduceMotion) {
    $$("[data-tilt]").forEach(card => {
      let raf = null;
      card.addEventListener("pointermove", e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const rx = ((e.clientY - r.top) / r.height - .5) * -7;
          const ry = ((e.clientX - r.left) / r.width - .5) * 7;
          card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
          raf = null;
        });
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ─────────── TESTIMONIALS SLIDER ─────────── */
  const slides = $$(".t-slide");
  const dots = $$(".t-dotbtn");
  let current = 0, sliderTimer;
  const goTo = i => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === current));
    dots.forEach((d, k) => d.classList.toggle("is-active", k === current));
  };
  const autoPlay = () => {
    clearInterval(sliderTimer);
    if (!reduceMotion) sliderTimer = setInterval(() => goTo(current + 1), 5600);
  };
  dots.forEach((d, k) => d.addEventListener("click", () => { goTo(k); autoPlay(); }));
  autoPlay();

  updateRoutePlane();
  addEventListener("resize", updateRoutePlane);

})();
