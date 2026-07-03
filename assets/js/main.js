/* Raisable — Accelerator-as-a-Service */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero video ---------- */
  var video = document.getElementById("hero-video");
  if (video) {
    if (reducedMotion) {
      video.removeAttribute("autoplay");
      video.pause();
    } else {
      // Source file is already slowed 1.5×; ease it slightly further for calm.
      video.playbackRate = 0.85;
      var playAttempt = video.play();
      if (playAttempt && playAttempt.catch) playAttempt.catch(function () {});
    }
  }

  /* ---------- Nav: solid after leaving hero ---------- */
  var nav = document.getElementById("nav");
  var hero = document.querySelector(".hero");
  if (nav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        nav.classList.toggle("is-solid", !entries[0].isIntersecting);
      },
      { rootMargin: "-64px 0px 0px 0px" }
    ).observe(hero);
  }

  /* ---------- Mobile menu ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal + count-up on scroll ---------- */
  var revealTargets = document.querySelectorAll(
    ".section-body, .funnel-title, .funnel-row, .deliv-plate, .who-card, " +
    ".team-card, .pilot-stat, .statement-h, .statement-cols p, .closing-inner, " +
    ".fired-card, .fact-chip, .included-panel, .faq-list details, .logo-row span, .mid-cta"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });

  // Stagger siblings: each reveal element waits a beat after the previous
  // one in the same parent, so grids cascade instead of popping at once.
  var groups = new Map();
  revealTargets.forEach(function (el) {
    var siblings = groups.get(el.parentElement) || [];
    siblings.push(el);
    groups.set(el.parentElement, siblings);
  });
  groups.forEach(function (siblings) {
    siblings.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", Math.min(i * 0.09, 0.45) + "s");
    });
  });

  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && !reducedMotion) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.querySelectorAll("[data-count]").forEach(function (n) {
            if (seen.has(n)) return;
            seen.add(n);
            countUp(n);
          });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Form modal ---------- */
  var modal = document.getElementById("form-modal");
  if (modal) {
    document.querySelectorAll("[data-open-form]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        modal.showModal();
        var first = document.getElementById("f-name");
        if (first) first.focus();
      });
    });
    modal.querySelector("[data-close-form]").addEventListener("click", function () {
      modal.close();
    });
    // Click on the backdrop (outside the dialog box) closes it
    modal.addEventListener("click", function (e) {
      var r = modal.getBoundingClientRect();
      var inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) modal.close();
    });
  }

  /* ---------- Lead form (Formspree) ---------- */
  var form = document.getElementById("lead-form");
  var status = document.getElementById("form-status");

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Native-style validation with visible marking
      var invalid = false;
      ["f-name", "f-company", "f-email"].forEach(function (id) {
        var input = document.getElementById(id);
        var bad =
          !input.value.trim() ||
          (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value));
        input.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      });
      if (invalid) {
        setStatus("Fill in your name, company, and a valid email to send the request.", "err");
        return;
      }

      if (form.action.indexOf("REPLACE_WITH_FORM_ID") !== -1) {
        setStatus(
          "Form endpoint isn't configured yet — email us directly at og@raisable.vc.",
          "err"
        );
        return;
      }

      var btn = form.querySelector(".btn-submit");
      btn.disabled = true;
      setStatus("Sending…");

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            setStatus("Request sent. We'll get back to you within one business day.", "ok");
          } else {
            return res.json().then(function (data) {
              var msg =
                data && data.errors
                  ? data.errors.map(function (er) { return er.message; }).join(", ")
                  : "Something went wrong — email us at og@raisable.vc instead.";
              setStatus(msg, "err");
            });
          }
        })
        .catch(function () {
          setStatus("Network error — email us at og@raisable.vc instead.", "err");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }
})();
