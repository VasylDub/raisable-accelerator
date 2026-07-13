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

/* ================================================================
   PORTED FROM raisable.vc MAIN SITE — member panels with border
   trace + 3D cube mosaic + mobile connected card.
   Keep in sync with the main site.
   ================================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Member panel: framed card (photo+name+role, bio+badges below,
     teal border trace + shimmer). Hover on pointer devices; tap-to-toggle
     with tap-outside-to-close on touch. One panel per grid. ---------- */
  (function () {
    var grids = document.querySelectorAll('.team-grid-4, .amb-cards');
    if (!grids.length) return;
    var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.documentElement.classList.add('member-panels-on');
    // mosaic cube assembly: the card's own content is sliced into small 3D
    // tiles (clip-path pieces of a live clone) that flip into place on open
    // and flip away in reverse order on close — on every hover/tap.
    // transform+opacity only; the stage is torn down right after each run.
    var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
    // Lightweight cube mosaic: the plate builds from small 3D-turning cubes
    // (plain divs — no content clones, so hundreds stay cheap), while the
    // real content sweeps in under them with one synced diagonal mask.
    function stopStage(panel) {
      if (panel.__mosaicTimer) { clearTimeout(panel.__mosaicTimer); panel.__mosaicTimer = null; }
      if (panel.__mosaicTimer2) { clearTimeout(panel.__mosaicTimer2); panel.__mosaicTimer2 = null; }
    }
    function buildStage(panel) {
      var old = panel.querySelector('.mosaic-stage');
      if (old) old.remove();
      var w = panel.offsetWidth, h = panel.offsetHeight;
      // phones / low-memory devices get a lighter grid (fewer GPU layers)
      var lite = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                 !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      var budget = lite ? 130 : 220;
      var tile = Math.max(22, Math.sqrt((w * h) / budget));
      var cols = Math.max(5, Math.round(w / tile));
      var rows = Math.max(5, Math.round(h / tile));
      while (cols * rows > budget + 20) { if (rows > cols) rows -= 1; else cols -= 1; }
      var stage = document.createElement('div');
      stage.className = 'mosaic-stage';
      var tiles = [];
      var max = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cube = document.createElement('i');
          cube.style.left = (c / cols * 100) + '%';
          cube.style.top = (r / rows * 100) + '%';
          cube.style.width = (100 / cols) + '%';
          cube.style.height = (100 / rows) + '%';
          cube.__d = (r + c) * 8 + ((r * 7 + c * 13) % 3) * 4;
          if (cube.__d > max) max = cube.__d;
          tiles.push(cube);
          stage.appendChild(cube);
        }
      }
      stage.__tiles = tiles;
      stage.__max = max;
      stage.__key = w + 'x' + h;
      panel.appendChild(stage);
      panel.__stage = stage;
      return stage;
    }
    function ensureStage(panel) {
      var st = panel.__stage;
      var key = panel.offsetWidth + 'x' + panel.offsetHeight;
      if (st && st.parentNode === panel && st.__key === key) return st;
      return buildStage(panel);
    }
    function playStage(panel, reversed, finish) {
      var stage = ensureStage(panel);
      stopStage(panel);
      stage.style.display = '';
      panel.classList.add('is-building');
      var body = panel.querySelector('.panel-body');
      var max = stage.__max;
      stage.__tiles.forEach(function (cb) { cb.style.animation = 'none'; });
      if (body) body.style.animation = 'none';
      void stage.offsetWidth; // commit the reset so replays restart
      var cubeAnim = reversed ? 'cube-out 0.38s' : 'cube-in 0.42s';
      stage.__tiles.forEach(function (cb) {
        var d = reversed ? (max - cb.__d) : cb.__d;
        cb.style.animation = cubeAnim + ' ' + EASE + ' ' + d + 'ms both';
      });
      if (body) {
        // opacity only — fully compositor-driven, no per-frame repaints
        body.style.animation = (reversed ? 'body-fade-out 0.32s ' + EASE + ' both'
                                         : 'body-fade-in 0.5s ' + EASE + ' 0.12s both');
      }
      var last = null;
      stage.__tiles.forEach(function (cb) {
        var d = reversed ? (max - cb.__d) : cb.__d;
        if (!last || d > last.__fin) { last = cb; last.__fin = d; }
      });
      var fired = false;
      var fin = function () {
        if (fired) return;
        fired = true;
        finish(stage, body);
      };
      last.addEventListener('animationend', fin, { once: true });
      panel.__mosaicTimer = setTimeout(fin, max + 1400);
    }
    function mosaicIn(panel) {
      if (reduceMotion) return;
      playStage(panel, false, function (stage, body) {
        panel.classList.remove('is-building');
        stage.style.display = 'none';
        if (body) body.style.animation = '';
      });
    }
    function mosaicOut(panel, done) {
      if (reduceMotion || !panel.classList.contains('is-on')) { done(); return; }
      playStage(panel, true, function (stage, body) {
        done(); // drop is-on before the content returns
        panel.__mosaicTimer2 = setTimeout(function () {
          panel.classList.remove('is-building');
          stage.style.display = 'none';
          if (body) body.style.animation = '';
        }, 120);
      });
    }
    var controllers = [];
    grids.forEach(function (grid) {
      var members = grid.querySelectorAll('[data-member-panel]');
      if (!members.length) return;
      var panel = document.createElement('div');
      panel.className = 'member-panel';
      panel.innerHTML =
        '<svg class="panel-trace" preserveAspectRatio="none" aria-hidden="true">' +
        '<rect class="tr-line" pathLength="100"/><rect class="tr-dot" pathLength="100"/>' +
        '<rect class="tr-shine" pathLength="100"/></svg>' +
        '<div class="panel-body">' +
        '<div class="panel-head" hidden></div>' +
        '<p class="panel-bio"></p><div class="panel-foot">' +
        '<a class="panel-li" target="_blank" rel="noopener" aria-label="LinkedIn profile" hidden>' +
        '<img src="assets/img/LG_LINKEDIN_ICON.svg" alt="LinkedIn"></a>' +
        '<div class="panel-tags"></div></div>' +
        '</div>';
      grid.appendChild(panel);
      var pHead = panel.querySelector('.panel-head');
      var pBio = panel.querySelector('.panel-bio');
      var pTags = panel.querySelector('.panel-tags');
      var pLi = panel.querySelector('.panel-li');
      var hideTimer = null;
      var current = null;
      var PAD = 14;

      function showPanel(el) {
        clearTimeout(hideTimer);
        var isMobile = window.matchMedia('(max-width: 560px)').matches;
        if (current && current !== el) current.classList.remove('is-spot');
        current = el;
        if (!isMobile) el.classList.add('is-spot');
        var bio = null;
        el.querySelectorAll('p').forEach(function (p) {
          if (!bio && !p.classList.contains('team-role')) bio = p;
        });
        var bioText = bio ? bio.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!bioText) {
          var role = el.querySelector('.amb-role');
          var loc = el.querySelector('.amb-loc');
          bioText = [role && role.textContent.trim(), loc && loc.textContent.trim()]
            .filter(Boolean).join(' · ');
        }
        pBio.textContent = bioText;
        pBio.hidden = !pBio.textContent;
        var tags = el.querySelector('.team-exp');
        // strip loading=lazy: source badges sit in a display:none block, so lazy
        // clones never fetch; load them eagerly inside the panel
        pTags.innerHTML = tags ? tags.outerHTML.replace(/ loading="lazy"/g, '') : '';
        var li = el.querySelector('.li-link');
        pLi.hidden = !li;
        if (li) pLi.href = li.href;
        var cRect = grid.getBoundingClientRect();
        var r = el.getBoundingClientRect();
        if (isMobile) {
          // phones (2-up): the card is too narrow to wrap, so the panel becomes
          // the full card — photo + name + role cloned in, bio + badges below,
          // all in one frame anchored where the tapped card sits
          var wrap = el.querySelector('.team-photo-wrap');
          var h3 = el.querySelector('h3');
          var role = el.querySelector('.team-role');
          pHead.innerHTML =
            (wrap ? wrap.outerHTML.replace(/ loading="lazy"/g, '') : '') +
            (h3 ? '<h3>' + h3.innerHTML + '</h3>' : '') +
            (role ? '<p class="team-role">' + role.innerHTML + '</p>' : '');
          pHead.hidden = false;
          grid.classList.add('is-panel-open');
          panel.classList.add('is-mobile');
          panel.style.left = '0px';
          panel.style.width = cRect.width + 'px';
          panel.style.top = (r.top - cRect.top) + 'px';
          panel.style.paddingTop = '';
        } else {
          pHead.hidden = true;
          pHead.innerHTML = '';
          panel.classList.remove('is-mobile');
          panel.style.top = (r.top - cRect.top - PAD) + 'px';
          panel.style.left = (r.left - cRect.left - PAD) + 'px';
          panel.style.width = (r.width + PAD * 2) + 'px';
          panel.style.paddingTop = (r.height + PAD + 8) + 'px';
        }
        var w = panel.offsetWidth, h = panel.offsetHeight;
        var svg = panel.querySelector('.panel-trace');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        panel.querySelectorAll('.panel-trace rect').forEach(function (rc) {
          rc.setAttribute('x', 1); rc.setAttribute('y', 1);
          rc.setAttribute('width', w - 2); rc.setAttribute('height', h - 2);
          rc.setAttribute('rx', 13);
        });
        panel.__member = el;
        panel.classList.add('is-on');
        mosaicIn(panel);
        if (isMobile) {
          requestAnimationFrame(function () {
            var pr = panel.getBoundingClientRect();
            if (pr.top < 70 || pr.bottom > window.innerHeight) {
              window.scrollTo({ top: window.scrollY + pr.top - 84, behavior: 'smooth' });
            }
          });
        }
      }
      function hideNow() {
        clearTimeout(hideTimer);
        var leaving = current;
        current = null;
        grid.classList.remove('is-panel-open');
        mosaicOut(panel, function () {
          panel.classList.remove('is-on');
          if (leaving) leaving.classList.remove('is-spot');
        });
      }
      function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideNow, 150);
      }

      if (hasHover) {
        members.forEach(function (el) {
          el.addEventListener('mouseenter', function () { showPanel(el); });
          el.addEventListener('mouseleave', scheduleHide);
          el.addEventListener('focusin', function () { showPanel(el); });
          el.addEventListener('focusout', scheduleHide);
        });
        panel.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
        panel.addEventListener('mouseleave', scheduleHide);
      } else {
        members.forEach(function (el) {
          el.setAttribute('tabindex', '0');
          el.addEventListener('click', function () {
            if (current === el) hideNow(); else showPanel(el);
          });
        });
        controllers.push({
          panel: panel,
          holds: function (t) { return panel.contains(t) || (current && current.contains(t)); },
          hide: hideNow
        });
      }
    });
    if (!hasHover && controllers.length) {
      document.addEventListener('click', function (e) {
        controllers.forEach(function (c) {
          if (c.panel.classList.contains('is-on') && !c.holds(e.target)) c.hide();
        });
      });
    }
  })();

})();
