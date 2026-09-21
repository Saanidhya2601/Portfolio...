(function () {
  gsap.registerPlugin(ScrollTrigger);

  var NAV_H = 64; // keep in sync with --nav-h

  var track = document.getElementById("track");
  var panels = gsap.utils.toArray(".panel");
  var progressFill = document.getElementById("progressFill");
  var navButtons = document.querySelectorAll(
    ".nav-links button, .nav-mobile button",
  );
  var clickTargets = document.querySelectorAll("[data-i]");
  var mainTrigger = null;

  function setActive(i) {
    navButtons.forEach(function (btn) {
      btn.classList.toggle(
        "active",
        parseInt(btn.getAttribute("data-i"), 10) === i,
      );
    });
  }

  var mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", function () {
    var distance = function () {
      return track.scrollWidth - window.innerWidth;
    };

    // per-panel quickSetters — far cheaper than gsap.set() on every scroll tick
    var setters = panels.map(function (panel) {
      return {
        x: gsap.quickSetter(panel, "x", "px"),
        y: gsap.quickSetter(panel, "y", "px"),
        scale: gsap.quickSetter(panel, "scale"),
        opacity: gsap.quickSetter(panel, "opacity"),
        el: panel,
      };
    });
    var trackX = gsap.quickSetter(track, "x", "px");

    mainTrigger = ScrollTrigger.create({
      trigger: "#pinWrapper",
      start: "top " + NAV_H,
      end: function () {
        return "+=" + distance();
      },
      pin: true,
      scrub: 0.65, // slight lag = smooth, weighty catch-up instead of 1:1 jitter
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: {
        // settle cleanly on a section instead of stopping mid-pan
        snapTo: 1 / (panels.length - 1),
        duration: { min: 0.25, max: 0.6 },
        ease: "power2.inOut",
      },
      onUpdate: function (self) {
        var p = self.progress;
        trackX(-p * distance());
        progressFill.style.width = p * 100 + "%";

        var floatIndex = p * (panels.length - 1);
        setters.forEach(function (s, i) {
          var d = Math.min(Math.abs(floatIndex - i), 1);
          // depth pass: receding panels sink back, shrink and fade — a real stack, not a fade
          s.scale(1 - d * 0.1);
          s.y(d * 22);
          s.opacity(1 - d * 0.7);
          s.el.style.zIndex = 10 - Math.round(d * 10);
        });

        setActive(Math.round(floatIndex));
      },
    });

    return function () {
      if (mainTrigger) mainTrigger.kill();
      mainTrigger = null;
      gsap.set(track, { x: 0 });
      gsap.set(panels, { x: 0, y: 0, scale: 1, opacity: 1, zIndex: 0 });
    };
  });

  // mobile (stacked, no pin): track plain page scroll to drive the progress bar + active link
  function updateMobileProgress() {
    if (window.innerWidth > 768) return;
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var p =
      scrollable > 0
        ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
        : 0;
    progressFill.style.width = p * 100 + "%";

    var closest = 0,
      closestDist = Infinity;
    panels.forEach(function (panel, i) {
      var dist = Math.abs(panel.getBoundingClientRect().top - NAV_H);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActive(closest);
  }
  var mobileTicking = false;
  window.addEventListener("scroll", function () {
    if (window.innerWidth > 768 || mobileTicking) return;
    mobileTicking = true;
    requestAnimationFrame(function () {
      updateMobileProgress();
      mobileTicking = false;
    });
  });
  window.addEventListener("resize", updateMobileProgress);
  updateMobileProgress();

  // nav clicks (navbar links, brand logo, mobile menu) -> jump to that panel
  var navMobile = document.getElementById("navMobile");
  var navBurger = document.getElementById("navBurger");

  clickTargets.forEach(function (el) {
    el.addEventListener("click", function () {
      var i = parseInt(el.getAttribute("data-i"), 10);
      navMobile.classList.remove("open");
      navBurger.classList.remove("open");

      if (window.innerWidth <= 768) {
        var panel = document.getElementById("p" + i);
        var top = panel.getBoundingClientRect().top + window.scrollY - NAV_H;
        window.scrollTo({ top: top, behavior: "smooth" });
        return;
      }
      var wrapperTop = document.getElementById("pinWrapper").offsetTop;
      var total = track.scrollWidth - window.innerWidth;
      var target = wrapperTop - NAV_H + (i / (panels.length - 1)) * total;
      window.scrollTo({ top: target, behavior: "smooth" });
    });
  });

  // mobile hamburger menu
  navBurger.addEventListener("click", function () {
    navMobile.classList.toggle("open");
    navBurger.classList.toggle("open");
  });

  // light/dark theme toggle, remembered per browser
  var themeToggle = document.getElementById("themeToggle");
  themeToggle.addEventListener("click", function () {
    var root = document.documentElement;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
  });

  // hero photo entrance
  window.addEventListener("load", function () {
    gsap.to("#heroPhoto", {
      scale: 1,
      opacity: 1,
      duration: 1.1,
      ease: "power3.out",
      delay: 0.2,
    });
    // fonts/images can reflow panel widths after first paint — recheck the pin distance once settled
    setTimeout(function () {
      ScrollTrigger.refresh();
    }, 300);
  });

  // projects: click a folder to open just that one; click it again to close it
  var grid = document.getElementById("folderGrid");
  grid.addEventListener("click", function (e) {
    var folder = e.target.closest(".folder");
    if (!folder) return;
    folder.classList.toggle("open");
    if (mainTrigger)
      setTimeout(function () {
        ScrollTrigger.refresh();
      }, 320);
  });
})();
