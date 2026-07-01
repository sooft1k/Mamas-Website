/* ═══════════════════════════════════════════════════════════════
   DANJELA GABA — shared interactions
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ─── PREFERENCES ─── */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* The page-entrance cascade (hero / page-hero) is driven entirely by
     render-blocking CSS animations (see "PAGE ENTRANCE" in shared.css), so
     it runs reliably on every single page load. JS only handles the
     scroll-triggered reveals further down the page. */

  /* ─── NAV SCROLL STATE ─── */
  function initNavScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ─── MOBILE MENU ─── */
  function initMobileMenu() {
    var burger = document.getElementById("hamburger");
    var menu = document.getElementById("mobile-menu");
    if (!burger || !menu) return;

    function close() {
      burger.classList.remove("open");
      menu.classList.remove("open");
      document.body.style.overflow = "";
    }
    burger.addEventListener("click", function () {
      var willOpen = !burger.classList.contains("open");
      burger.classList.toggle("open", willOpen);
      menu.classList.toggle("open", willOpen);
      document.body.style.overflow = willOpen ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        // let the transition handler take over, just close visually
        close();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ─── REVEAL ON SCROLL (below-the-fold content) ─── */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ─── PAGE TRANSITIONS (Vorhang schließen, navigieren, öffnen) ─── */
  function initPageTransitions() {
    // Beim Klick auf einen internen Link schließt sich der Vorhang weich
    // (body.is-leaving → curtainCover in shared.css). Erst wenn er den
    // Bildschirm deckt, navigieren wir — so bleibt der Reload unsichtbar.
    // Die neue Seite öffnet den Vorhang dann von selbst wieder. Läuft
    // überall, auch in der lokalen Datei-Vorschau (file://).
    var LEAVE_MS = 320; // == main-Ausblendung in shared.css

    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      var target = link.getAttribute("target");
      if (
        !href ||
        href.charAt(0) === "#" ||
        href.indexOf("http") === 0 ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("tel:") === 0 ||
        target === "_blank" ||
        link.hasAttribute("data-no-transition")
      ) {
        return;
      }
      // Only intercept internal .html links
      if (href.indexOf(".html") === -1 && href !== "/") return;

      link.addEventListener("click", function (e) {
        // allow modifier-clicks (new tab) to work normally
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (document.body.classList.contains("is-leaving")) return;
        document.body.classList.add("is-leaving");
        setTimeout(function () {
          window.location.href = href;
        }, LEAVE_MS);
      });
    });
  }

  /* ─── EINBLENDEN ERNEUT ABSPIELEN (Zurück-/Vor-Button) ─── */
  // Springt man per Zurück-Button zurück, holt der Browser die Seite
  // fertig aus dem Cache (bfcache) — CSS-Animationen laufen dann NICHT
  // erneut. Damit auch beim Zurückspringen alles wieder reinschwebt,
  // starten wir die Hero-Animationen hier von Hand neu.
  function replayEntrance() {
    if (reduceMotion) return;
    var sel =
      ".hero-image, .hero-meta, .hero-h1, .hero-bottom, " +
      ".page-hero .grid-lines, .ph-ghost, .page-hero .ph-meta, " +
      ".page-hero h1, .page-hero .ph-sub";
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.animation = "none";
      // Reflow erzwingen, damit die Animation wirklich neu startet
      void el.offsetWidth;
      el.style.animation = "";
    });
  }

  /* ─── KONTAKTFORMULAR · senden ohne Weiterleitung ─── */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    var status = document.getElementById("form-status");
    if (!form || !status) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var original = btn ? btn.textContent : "";
      status.className = "form-status"; // reset

      if (btn) { btn.disabled = true; btn.textContent = "Wird gesendet …"; }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            status.textContent =
              "Danke für Ihre Nachricht — ich melde mich persönlich bei Ihnen zurück.";
            status.className = "form-status success show";
          } else {
            return res.json().then(function (data) {
              var msg =
                data && data.errors
                  ? data.errors.map(function (x) { return x.message; }).join(", ")
                  : "Etwas ist schiefgelaufen.";
              throw new Error(msg);
            });
          }
        })
        .catch(function () {
          status.textContent =
            "Senden hat nicht geklappt. Schreiben Sie mir gern direkt an danjela.gaba@hotmail.com oder rufen Sie an: +43 676 693 1597.";
          status.className = "form-status error show";
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = original; }
        });
    });
  }

  /* ─── FAQ · Akkordeon ─── */
  function initFaq() {
    var items = document.querySelectorAll(".faq-item");
    if (!items.length) return;
    items.forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.setAttribute("aria-expanded", "false");
      q.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        // andere schließen (Akkordeon-Verhalten)
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove("open");
            var oa = other.querySelector(".faq-a");
            var oq = other.querySelector(".faq-q");
            if (oa) oa.style.maxHeight = "";
            if (oq) oq.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("open", !isOpen);
        q.setAttribute("aria-expanded", String(!isOpen));
        a.style.maxHeight = !isOpen ? a.scrollHeight + "px" : "";
      });
    });
  }

  /* ─── MODALS ─── */
  window.openModal = function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("open");
      document.body.style.overflow = "hidden";
    }
  };
  window.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove("open");
      document.body.style.overflow = "";
    }
  };
  function initModals() {
    document.querySelectorAll(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) {
          m.classList.remove("open");
          document.body.style.overflow = "";
        }
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal.open").forEach(function (m) {
          m.classList.remove("open");
        });
        document.body.style.overflow = "";
      }
    });
  }

  /* ─── SCROLL PROGRESS BAR ─── */
  function initScrollProgress() {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? window.scrollY / h : 0;
      bar.style.transform = "scaleX(" + p + ")";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* ─── HERO SCROLL CUE ─── */
  function initHeroCue() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var cue = document.createElement("div");
    cue.className = "scroll-cue";
    cue.innerHTML = "<span>Scroll</span><span class=\"line\"></span>";
    hero.appendChild(cue);
  }

  /* ─── PAGE-HERO GHOST NUMERAL ─── */
  function initGhostNumeral() {
    var inner = document.querySelector(".page-hero .inner");
    if (!inner) return;
    var metaNum = inner.querySelector(".ph-meta span");
    if (!metaNum) return;
    var digits = (metaNum.textContent.match(/\d+/) || [""])[0];
    if (!digits) return;
    var ghost = document.createElement("div");
    ghost.className = "ph-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = digits;
    inner.appendChild(ghost);
  }

  /* ─── COUNT-UP STATS ─── */
  function initCountUp() {
    var nums = document.querySelectorAll(".about-stat .num");
    if (!nums.length || reduceMotion || !("IntersectionObserver" in window)) return;

    function run(el) {
      var tn = el.firstChild;
      var target = parseInt(el.getAttribute("data-target"), 10);
      var start = performance.now(), dur = 1500;
      (function frame(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        tn.textContent = Math.round(eased * target);
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); }
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) {
      var tn = el.firstChild;
      if (!tn || tn.nodeType !== 3) return;
      var target = parseInt(tn.textContent, 10);
      if (isNaN(target)) return;
      el.setAttribute("data-target", target);
      tn.textContent = "0";
      obs.observe(el);
    });
  }

  /* ─── MAGNETIC BUTTONS ─── */
  function initMagnetic() {
    if (reduceMotion || !finePointer) return;
    var els = document.querySelectorAll(".nav-cta, .hero-actions .btn, .cta-center .btn");
    els.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.28;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.28;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ─── PROJECT GALLERY (lightbox) ─── */
  function initGallery() {
    var DATA = {
      einfamilienhaus: {
        title: "Haus am Feldrand", meta: "Leopoldsdorf · Wohnbau · 2024",
        images: [
          { src: "bilder/eingang.jpeg", cap: "Eingangsansicht" },
          { src: "bilder/garten.jpeg",  cap: "Gartenansicht" }
        ]
      },
      wohnanlage: {
        title: "Wohnanlage", meta: "Wien · Mehrfamilienhaus · 2023",
        images: [
          { src: "bilder/wohnhaus.jpeg", cap: "Straßenansicht" }
        ]
      },
      gewerbe: {
        title: "Büro & Lagerhalle", meta: "Traiskirchen · Gewerbebau · 2008",
        images: [
          { src: "bilder/gewerbeobjekt.JPEG", cap: "Außenansicht" },
          { src: "bilder/vorne.JPEG", cap: "Frontansicht" },
          { src: "bilder/links.JPEG", cap: "Seitenansicht" },
          { src: "bilder/Ans.jpg", cap: "Ansichten / Fassaden" },
          { src: "bilder/EG.jpg", cap: "Grundriss Erdgeschoss" },
          { src: "bilder/OG.jpg", cap: "Grundriss Obergeschoss" }
        ]
      }
    };

    if (!document.querySelector("[data-gallery]")) return;

    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.id = "galerie";
    lb.setAttribute("aria-hidden", "true");
    lb.innerHTML =
      '<div class="lb-backdrop" data-close></div>' +
      '<button class="lb-close" data-close aria-label="Galerie schließen">&times;</button>' +
      '<div class="lb-bar">' +
        '<div class="lb-titles"><span class="lb-title"></span><span class="lb-meta"></span></div>' +
        '<span class="lb-count"></span>' +
      '</div>' +
      '<button class="lb-nav lb-prev" aria-label="Vorheriges Bild">&#8249;</button>' +
      '<figure class="lb-stage"><img class="lb-img" alt="" /><figcaption class="lb-cap"></figcaption></figure>' +
      '<button class="lb-nav lb-next" aria-label="Nächstes Bild">&#8250;</button>' +
      '<div class="lb-thumbs"></div>';
    document.body.appendChild(lb);

    var elImg = lb.querySelector(".lb-img");
    var elCap = lb.querySelector(".lb-cap");
    var elTitle = lb.querySelector(".lb-title");
    var elMeta = lb.querySelector(".lb-meta");
    var elCount = lb.querySelector(".lb-count");
    var elThumbs = lb.querySelector(".lb-thumbs");
    var cur = null, idx = 0;

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function show(i) {
      var imgs = cur.images;
      idx = (i + imgs.length) % imgs.length;
      var item = imgs[idx];
      elImg.classList.remove("loaded");
      elImg.onload = function () { elImg.classList.add("loaded"); };
      elImg.src = item.src;
      if (elImg.complete) elImg.classList.add("loaded");
      elImg.alt = cur.title + " — " + item.cap;
      elCap.textContent = item.cap;
      elCount.textContent = pad(idx + 1) + " / " + pad(imgs.length);
      var tbs = elThumbs.children;
      for (var t = 0; t < tbs.length; t++) tbs[t].classList.toggle("active", t === idx);
      if (tbs[idx]) tbs[idx].scrollIntoView({ block: "nearest", inline: "center" });
    }

    function open(key) {
      cur = DATA[key];
      if (!cur) return;
      elTitle.textContent = cur.title;
      elMeta.textContent = cur.meta;
      elThumbs.innerHTML = "";
      lb.classList.toggle("single", cur.images.length < 2);
      cur.images.forEach(function (item, i) {
        var b = document.createElement("button");
        b.className = "lb-thumb";
        b.type = "button";
        b.setAttribute("aria-label", item.cap);
        b.innerHTML = '<img src="' + item.src + '" alt="" loading="lazy" />';
        b.addEventListener("click", function () { show(i); });
        elThumbs.appendChild(b);
      });
      show(0);
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function close() {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-gallery]");
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute("data-gallery"));
    });
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ─── INIT ─── */
  document.addEventListener("DOMContentLoaded", function () {
    initNavScroll();
    initMobileMenu();
    initReveal();
    initPageTransitions();
    initModals();
    initContactForm();
    initFaq();
    initScrollProgress();
    initHeroCue();
    initGhostNumeral();
    initCountUp();
    initMagnetic();
    initGallery();
  });

  // Restore visible state when navigating back via bfcache,
  // and replay the entrance cascade so it floats in again.
  window.addEventListener("pageshow", function (e) {
    document.body.classList.remove("is-leaving");
    if (e.persisted) replayEntrance();
  });
})();
