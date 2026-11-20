(function () {
  "use strict";

  var panels = Array.from(document.querySelectorAll(".panel"));
  var navigation = Array.from(document.querySelectorAll(".nav-link"));
  var action = document.getElementById("action");
  var articles = Array.from(action.querySelectorAll(".note-entry"));
  var reader = action.querySelector(".reading-layout");
  var directory = action.querySelector(".topic-directory");
  var actionHeading = action.querySelector("[data-action-heading]");
  var toolbar = action.querySelector(".article-toolbar");
  var returnLink = action.querySelector("[data-reading-return]");
  var chapters = action.querySelector(".chapter-index");
  var related = action.querySelector(".topic-related");
  var chapterTemplates = Array.from(chapters.querySelectorAll("a"));
  var sections = [];
  var chapterLinks = [];
  var activeEntry;
  var activeRoute;
  var scrollFrame = 0;
  var stateTimer = 0;
  var stateKey = "ryeReading";
  var documentPath = location.pathname;
  var existing = history.state && history.state[stateKey];
  var session = existing && existing.documentPath === documentPath ? existing.session : String(Date.now()) + Math.random().toString(36).slice(2);

  document.getElementById("year").textContent = String(new Date().getFullYear());
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // Keep the mobile menu beside the article title; the desktop index stays in its own column.
  var mobileMenu = document.createElement("details");
  mobileMenu.className = "mobile-chapters";
  var summary = document.createElement("summary");
  mobileMenu.appendChild(summary);
  var mobileNav = document.createElement("nav");
  mobileMenu.appendChild(mobileNav);
  articles.forEach(function (article) {
    var heading = article.querySelector("h2");
    heading.id = "note-" + article.id + "-title";
    heading.tabIndex = -1;
  });
  Array.from(document.querySelectorAll("a[href^='#']")).forEach(function (link, index) {
    if (!link.id) link.id = "reading-link-" + index;
  });

  function setupChapters(topic) {
    sections = topic ? Array.from(topic.querySelectorAll(".note-subsection")) : [];
    chapterLinks = [];
    chapters.replaceChildren();
    mobileNav.replaceChildren();
    if (sections.length < 2) return;
    var label = topic.querySelector(".note-index").textContent.split(" / ")[1];
    chapters.setAttribute("aria-label", label + "小节");
    mobileNav.setAttribute("aria-label", label + "小节（手机）");
    var count = sections.length + " 节";
    var caption = document.createElement("span");
    caption.textContent = "本篇目录 / " + count;
    chapters.appendChild(caption);
    summary.textContent = "本篇目录 · " + count;
    sections.forEach(function (section, index) {
      var href = section.id === "environment-experience" ? "#action/environment-experience" : "#action/" + topic.id + "/" + section.id.slice(topic.id.length + 1);
      var template = chapterTemplates.find(function (link) { return link.hash === href; });
      var link = document.createElement("a");
      link.href = href;
      link.id = "chapter-desktop-" + section.id;
      link.dataset.section = section.id;
      link.textContent = template ? template.textContent : String(index + 1).padStart(2, "0") + " " + section.querySelector("h3").textContent;
      chapters.appendChild(link);
      var mobileLink = link.cloneNode(true);
      mobileLink.id = "chapter-mobile-" + section.id;
      mobileNav.appendChild(mobileLink);
      chapterLinks.push(link, mobileLink);
    });
    topic.querySelector("h2").after(mobileMenu);
  }

  function readRoute() {
    var parts = (location.hash.slice(1) || "about").split("/");
    if (parts[0] === "stories") return { panel: "about", target: document.getElementById("stories"), key: "stories" };
    var panel = panels.find(function (item) { return item.id === parts[0]; });
    if (!panel) return { panel: "about", target: null, key: "about" };
    if (panel.id !== "action") return { panel: panel.id, target: null, key: panel.id };
    var topic = articles.find(function (item) { return item.id === parts[1]; });
    var target = null;
    if (parts[1] === "environment-experience") {
      topic = document.getElementById("environment");
      target = document.getElementById("environment-experience");
    } else if (topic && parts[2]) {
      target = topic.querySelector("#" + topic.id + "-" + parts[2].replace(/[^a-z-]/g, ""));
      if (!target || !target.classList.contains("note-subsection")) target = null;
    }
    var key = topic ? "action/" + topic.id : "action";
    if (target) key = target.id === "environment-experience" ? "action/environment-experience" : key + "/" + parts[2];
    return { panel: "action", topic: topic, target: target, key: key };
  }

  function writeState(entry, url) {
    var state = Object.assign({}, history.state);
    state[stateKey] = entry;
    history.replaceState(state, "", url || location.href);
  }

  function savePosition(focusId) {
    if (!activeEntry) return;
    activeEntry.scroll = window.scrollY;
    activeEntry.menuOpen = mobileMenu.open;
    if (focusId) activeEntry.focusId = focusId;
    writeState(activeEntry);
  }

  function sourcePosition() {
    return { session: session, index: activeEntry.index, route: activeRoute.key, scroll: activeEntry.scroll, focusId: activeEntry.focusId };
  }

  function updateChapter() {
    if (!activeRoute || !activeRoute.topic || sections.length < 2) return;
    var current = null;
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = section.id;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = sections[sections.length - 1].id;
    chapterLinks.forEach(function (link) {
      var selected = current === link.dataset.section;
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function activate(entry, restore, focus) {
    clearTimeout(stateTimer);
    activeEntry = entry;
    activeRoute = readRoute();
    var route = activeRoute;
    panels.forEach(function (panel) {
      panel.hidden = panel.id !== route.panel;
      panel.classList.toggle("is-active", !panel.hidden);
    });
    navigation.forEach(function (link) {
      var selected = link.hash === "#" + route.panel;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    var reading = route.panel === "action" && Boolean(route.topic);
    document.documentElement.classList.toggle("is-reading", reading);
    action.classList.toggle("is-reading-topic", reading);
    directory.hidden = reading;
    actionHeading.hidden = reading;
    toolbar.hidden = !reading;
    reader.hidden = !reading;
    setupChapters(reading ? route.topic : null);
    chapters.hidden = !reading || sections.length < 2;
    reader.classList.toggle("has-chapters", !chapters.hidden);
    articles.forEach(function (article) { article.hidden = article !== route.topic; });
    related.hidden = !reading;
    if (reading) {
      var label = route.topic.querySelector(".note-index").textContent.split(" / ")[1];
      toolbar.querySelector("[data-topic-name]").textContent = label;
      action.setAttribute("aria-labelledby", route.topic.querySelector("h2").id);
      returnLink.hidden = !entry.returnTo;
      returnLink.href = "#" + (entry.returnTo ? entry.returnTo.route : "action");
      related.replaceChildren();
      var all = document.createElement("a");
      all.href = "#action";
      all.textContent = "浏览全部主题 ↗";
      all.id = "article-all-topics";
      related.appendChild(all);
      var next = articles[(articles.indexOf(route.topic) + 1) % articles.length];
      var nextLink = document.createElement("a");
      nextLink.href = "#action/" + next.id;
      nextLink.id = "article-next-topic";
      nextLink.textContent = "继续阅读：" + next.querySelector(".note-index").textContent.split(" / ")[1] + " ↗";
      related.appendChild(nextLink);
    } else action.setAttribute("aria-labelledby", "action-title");

    mobileMenu.open = Boolean(restore && reading && sections.length > 1 && entry.menuOpen);
    var focusTarget = reading ? route.topic.querySelector("h2") : document.querySelector("#" + route.panel + " h1");
    if (restore && Number.isFinite(entry.scroll)) {
      window.scrollTo(0, entry.scroll);
      var savedFocus = entry.focusId && document.getElementById(entry.focusId);
      if (savedFocus && savedFocus.getClientRects().length) focusTarget = savedFocus;
    } else {
      var scrollTarget = route.target || (reading ? toolbar : null);
      if (scrollTarget) scrollTarget.scrollIntoView({ block: "start" });
      else window.scrollTo(0, 0);
      if (route.target) focusTarget = route.target;
    }
    if (focus && focusTarget) focusTarget.focus({ preventScroll: true });
    entry.route = route.key;
    entry.scroll = window.scrollY;
    writeState(entry, "#" + route.key);
    updateChapter();
  }

  function navigate(destination, link) {
    savePosition(link.id);
    var source = sourcePosition();
    var oldRoute = activeRoute;
    var entry = {
      session: session, documentPath: documentPath, index: activeEntry.index + 1,
      returnTo: source, homeSource: oldRoute.panel === "about" ? source : activeEntry.homeSource
    };
    history.pushState({ ryeReading: entry }, "", destination);
    var nextRoute = readRoute();
    if (oldRoute.topic && nextRoute.topic === oldRoute.topic) entry.returnTo = activeEntry.returnTo;
    activate(entry, false, true);
  }

  function returnTo(source) {
    if (!source || source.session !== session || source.index >= activeEntry.index) return false;
    savePosition();
    history.go(source.index - activeEntry.index);
    return true;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href^='#']");
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var destination = link.getAttribute("href");
    if (destination === "#main") {
      event.preventDefault();
      document.getElementById("main").focus({ preventScroll: true });
      document.getElementById("main").scrollIntoView({ block: "start" });
      return;
    }
    var panelId = destination.slice(1).split("/")[0];
    if (panelId !== "stories" && !panels.some(function (panel) { return panel.id === panelId; })) return;
    event.preventDefault();
    if (link.hasAttribute("data-reading-return") && returnTo(activeEntry.returnTo)) return;
    if (link.hasAttribute("data-return-home") && returnTo(activeEntry.homeSource)) return;
    navigate(destination, link);
  });

  function onHistory() {
    var entry = history.state && history.state[stateKey];
    if (entry && entry.session === session) {
      if (entry.index === activeEntry.index && readRoute().key === activeRoute.key) return;
      activate(entry, true, true);
    } else {
      // A manually edited hash creates an entry without our state.
      entry = { session: session, documentPath: documentPath, index: activeEntry.index + 1, returnTo: null, homeSource: activeEntry.homeSource };
      activate(entry, false, true);
    }
  }
  window.addEventListener("popstate", onHistory);
  window.addEventListener("hashchange", onHistory);
  window.addEventListener("scroll", function () {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0;
      updateChapter();
    });
    clearTimeout(stateTimer);
    stateTimer = setTimeout(function () { savePosition(); }, 120);
  }, { passive: true });
  window.addEventListener("resize", updateChapter);
  window.addEventListener("pagehide", function () { savePosition(); });

  var initial = existing && existing.session === session ? existing : { session: session, documentPath: documentPath, index: 0, returnTo: null, homeSource: null };
  activate(initial, Boolean(existing && existing.session === session), false);
})();
