(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: scroll state ---------- */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");

  const setNav = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  toggle.addEventListener("click", () => setNav(toggle.getAttribute("aria-expanded") !== "true"));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setNav(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setNav(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && setNav(false));

  /* ---------- Active nav link while scrolling ---------- */
  const navLinks = $$('.nav ul a[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${entry.target.id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Service filters ---------- */
  const chips = $$(".chip");
  const services = $$(".service");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      chips.forEach((c) => {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", String(active));
      });
      services.forEach((s) => {
        s.hidden = filter !== "all" && s.dataset.cat !== filter;
      });
    });
  });

  /* ---------- Office hours: today + open/closed (Manila time) ---------- */
  const manilaNow = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[get("weekday")], minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
  };

  try {
    const { day, minutes } = manilaNow();
    const row = $(`.hours tr[data-day="${day}"]`);
    if (row) row.classList.add("is-today");

    const status = $("#open-status");
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && minutes >= 9 * 60 && minutes < 17 * 60;
    status.textContent = isOpen ? "Open now" : day === 6 ? "By appointment today" : "Closed now";
    status.classList.add(isOpen ? "open" : "closed");
    status.hidden = false;
  } catch (_) {
    /* Intl time zones unsupported — leave the table as is */
  }

  /* ---------- Reveal on scroll ---------- */
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const targets = $$(".section-head, .service, .pillars li, .process li, .cta-inner, .contact-info, .form-card");
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- Contact form ---------- */
  const form = $("#contact-form");
  const statusEl = $("#form-status");
  const submitBtn = $('button[type="submit"]', form);
  const CONTACT_EMAIL = "mergeconsulting.mla@gmail.com";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const setFieldError = (input, message) => {
    const field = input.closest(".field");
    let err = $(".field-error", field);
    field.classList.toggle("has-error", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (message) {
      if (!err) {
        err = document.createElement("span");
        err.className = "field-error";
        err.id = `${input.id}-error`;
        field.appendChild(err);
      }
      err.textContent = message;
      input.setAttribute("aria-describedby", err.id);
    } else if (err) {
      err.remove();
      input.removeAttribute("aria-describedby");
    }
  };

  const validate = () => {
    const email = form.email;
    const message = form.message;
    let firstInvalid = null;

    if (!emailPattern.test(email.value.trim())) {
      setFieldError(email, email.value.trim() ? "Please enter a valid email address." : "Email is required.");
      firstInvalid = firstInvalid || email;
    } else setFieldError(email, "");

    if (message.value.trim().length < 10) {
      setFieldError(message, "Please tell us a little more (at least 10 characters).");
      firstInvalid = firstInvalid || message;
    } else setFieldError(message, "");

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  };

  ["email", "message"].forEach((name) =>
    form[name].addEventListener("input", () => {
      if (form[name].closest(".field").classList.contains("has-error")) validate();
    })
  );

  const setLoading = (loading) => {
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
      ? '<span class="spinner" aria-hidden="true"></span><span class="btn-label">Sending…</span>'
      : '<span class="btn-label">Send message</span>';
  };

  const mailtoFallback = (data) => {
    const subject = `Website inquiry${data.service ? ` — ${data.service}` : ""}`;
    const body = [
      `Name: ${data.name || "-"}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || "-"}`,
      `Service: ${data.service || "-"}`,
      "",
      data.message,
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";
    statusEl.textContent = "";
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        form.reset();
        statusEl.className = "form-status success";
        statusEl.textContent = "Thank you! Your message has been sent. We'll be in touch within one business day.";
      } else if (json.fallback) {
        statusEl.textContent = "Opening your email app to send your message…";
        mailtoFallback(data);
      } else {
        throw new Error(json.error || "Request failed");
      }
    } catch (_) {
      statusEl.className = "form-status error";
      statusEl.innerHTML = `Something went wrong. Please email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> or call +63 956 983 1313.`;
    } finally {
      setLoading(false);
    }
  });

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
