(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var validPanels = panels.map(function (p) {
    return p.getAttribute("data-panel");
  });

  function activate(name) {
    if (validPanels.indexOf(name) === -1) {
      name = "about";
    }

    panels.forEach(function (p) {
      p.hidden = p.getAttribute("data-panel") !== name;
      p.classList.toggle("is-active", p.getAttribute("data-panel") === name);
    });

    tabs.forEach(function (t) {
      var on = t.getAttribute("data-panel") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });

    if (window.location.hash !== "#" + name) {
      history.replaceState(null, "", "#" + name);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      activate(t.getAttribute("data-panel"));
    });
  });

  window.addEventListener("hashchange", function () {
    activate(window.location.hash.slice(1));
  });

  activate(window.location.hash.slice(1) || "about");
})();
