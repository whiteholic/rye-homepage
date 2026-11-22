(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionButton = document.querySelector(".motion-toggle");
  var motionWanted = true;
  var running = [];
  var previousPanel = location.hash.slice(1).split("/")[0] || "menu";
  var previousReading = previousPanel === "action" && location.hash.split("/").length > 1;
  var burst = document.querySelector(".menu-burst");
  var wipe = document.querySelector(".scene-transition");
  var confirmation = null;
  function motionEnabled() { return motionWanted && !reduced.matches; }
  function cancelAnimations() {
    running.forEach(function (animation) { animation.cancel(); });
    running = [];
    burst.hidden = true;
    wipe.hidden = true;
  }
  function animate(element, frames, options) {
    var animation = element.animate(frames, options);
    running.push(animation);
    return animation;
  }
  function syncMotion() {
    var enabled = motionEnabled();
    document.documentElement.classList.toggle("motion-off", !enabled);
    motionButton.setAttribute("aria-pressed", String(enabled));
    motionButton.textContent = enabled ? "动效 ON" : "动效 OFF";
    if (!enabled) cancelAnimations();
  }
  motionButton.addEventListener("click", function () { motionWanted = !motionEnabled(); syncMotion(); });
  reduced.addEventListener("change", syncMotion);
  syncMotion();
  var menu = document.getElementById("menu");
  var choices = Array.from(menu.querySelectorAll(".main-choices a"));
  function selectChoice(selected) {
    menu.dataset.selection = String(choices.indexOf(selected));
    choices.forEach(function (choice) { choice.classList.toggle("is-current", choice === selected); });
  }
  choices.forEach(function (choice) {
    choice.addEventListener("pointerenter", function (event) { if (event.pointerType !== "touch") selectChoice(choice); });
    choice.addEventListener("focus", function () { selectChoice(choice); });
    choice.addEventListener("keydown", function (event) {
      var index = choices.indexOf(choice);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        choices[(index + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length].focus();
      }
    });
  });
  selectChoice(choices[0]);
  // Capture the real button position before the existing router changes panels.
  // This observer never intercepts navigation or writes reading history.
  document.addEventListener("click", function (event) {
    confirmation = null;
    var choice = event.target.closest(".main-choices a");
    if (!choice || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    selectChoice(choice);
    var rect = choice.getBoundingClientRect();
    confirmation = { x: rect.left + rect.width * .77, y: rect.top + rect.height / 2 };
  }, true);
  function entrance(elements, duration) {
    cancelAnimations();
    if (!motionEnabled()) return;
    elements.forEach(function (element, index) {
      if (!element) return;
      running.push(element.animate([
        { opacity: .25, transform: "translate(" + (index % 2 ? "18px" : "-18px") + ", 7px)", clipPath: "polygon(0 0, 88% 0, 100% 100%, 0 100%)" },
        { opacity: 1, transform: "translate(0, 0)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }
      ], { duration: duration, delay: index * 35, easing: "cubic-bezier(.2,.75,.25,1)" }));
    });
  }
  function homeEntrance() {
    if (!motionEnabled()) return;
    var layers = [menu.querySelector(".menu-word"), menu.querySelector(".menu-portrait"), menu.querySelector(".menu-content .eyebrow"), menu.querySelector("h1")].concat(choices, [menu.querySelector(".menu-foot")]);
    layers.forEach(function (element, index) {
      animate(element, [
        { opacity: 0, translate: index === 1 ? "-55px 20px" : index === 0 ? "75px -25px" : "38px 0" },
        { opacity: 1, translate: "0 0" }
      ], { duration: index < 2 ? 650 : 380, delay: index * 45, easing: "cubic-bezier(.16,.8,.2,1)", fill: "backwards" });
    });
  }
  function confirmMenu(point) {
    burst.style.left = Math.max(36, Math.min(point.x, window.innerWidth - 36)) + "px";
    burst.style.top = Math.max(36, Math.min(point.y, window.innerHeight - 36)) + "px";
    burst.hidden = false;
    var effect = animate(burst, [
      { opacity: 1, transform: "translate(-50%,-50%) scale(.15) rotate(-30deg)" },
      { opacity: .9, offset: .7 },
      { opacity: 0, transform: "translate(-50%,-50%) scale(1.8) rotate(60deg)" }
    ], { duration: 480, easing: "ease-out" });
    effect.finished.then(function () { burst.hidden = true; }, function () {});
  }
  function cutTransition(panel, returning) {
    wipe.classList.toggle("is-returning", returning);
    wipe.hidden = false;
    var label = wipe.querySelector("span");
    label.textContent = returning ? "返回主菜单" : panel.querySelector("h1").textContent;
    Array.from(wipe.querySelectorAll("i")).forEach(function (layer, index) {
      animate(layer, [
        { transform: "translateX(-140%) skewX(-18deg)" },
        { transform: "translateX(0) skewX(-18deg)", offset: .43 },
        { transform: "translateX(0) skewX(-18deg)", offset: .55 },
        { transform: "translateX(140%) skewX(-18deg)" }
      ], { duration: 300, delay: index * 40, easing: "cubic-bezier(.65,0,.25,1)", fill: "backwards" });
    });
    var effect = animate(label, [
      { opacity: 0, translate: "-45px 0" },
      { opacity: 1, translate: "0 0", offset: .32 },
      { opacity: 1, translate: "0 0", offset: .62 },
      { opacity: 0, translate: "70px 0" }
    ], { duration: 380 });
    effect.finished.then(function () { wipe.hidden = true; }, function () {});
  }
  document.addEventListener("rye:navigate", function (event) {
    var detail = event.detail;
    var point = confirmation;
    confirmation = null;
    cancelAnimations();
    if (detail.panel !== previousPanel && !detail.restore && !detail.reading) {
      var panel = document.getElementById(detail.panel);
      if (detail.panel === "menu") homeEntrance();
      else entrance([panel.querySelector(".page-heading"), panel.querySelector(".home-stories, .topic-stage, .interest-categories, .empty-note, .music-categories")], 345);
      if (motionEnabled() && !previousReading) cutTransition(panel, detail.panel === "menu");
      if (motionEnabled() && point) confirmMenu(point);
    }
    previousPanel = detail.panel;
    previousReading = detail.reading;
  });
  if (menu.classList.contains("is-active")) homeEntrance();
  var preview = document.querySelector(".topic-preview");
  var topics = Array.from(document.querySelectorAll("[data-topic-preview]"));
  function previewTopic(link) {
    topics.forEach(function (item) { item.classList.toggle("is-preview", item === link); });
    preview.querySelector("svg").replaceWith(link.querySelector("svg").cloneNode(true));
    preview.querySelector("span").textContent = link.querySelector(".topic-number").textContent + " / " + link.querySelector("strong").textContent;
    preview.querySelector("p").textContent = link.querySelector("strong + span").textContent;
  }
  topics.forEach(function (link) {
    link.addEventListener("pointerenter", function (event) { if (event.pointerType !== "touch") previewTopic(link); });
    link.addEventListener("focus", function () { previewTopic(link); });
  });
  previewTopic(topics[0]);
  document.querySelectorAll("[data-interest-category]").forEach(function (button) {
    button.addEventListener("click", function () { entrance([document.getElementById(button.dataset.interestCategory)], 220); });
  });

  // One persistent attachment, independent of route and article rendering.
  var sound = document.querySelector(".sound-widget");
  var disc = sound.querySelector(".sound-disc");
  var options = sound.querySelector(".sound-options");
  var caption = sound.querySelector(".sound-caption strong");
  var modes = Array.from(sound.querySelectorAll("[data-sound-kind]"));
  var names = { vocal: "有人声的音乐", instrumental: "纯音乐" };
  var kind = "vocal";
  var position = { x: window.innerWidth - 72, y: window.innerHeight - 76 };
  var drag = null;
  var skipClickUntil = 0;
  var hover = false;
  var keyboard = false;
  var latched = false;
  var keyNavigation = false;
  var closeTimer;
  function setOpen(open) {
    options.hidden = !open;
    disc.setAttribute("aria-expanded", String(open));
    if (open) place(position.x, position.y);
  }
  function close() { clearTimeout(closeTimer); hover = false; keyboard = false; latched = false; setOpen(false); }
  function syncOpen() { setOpen(!drag && (hover || keyboard || latched)); }
  function place(x, y) {
    position.x = Math.max(12, Math.min(x, window.innerWidth - 60));
    position.y = Math.max(12, Math.min(y, window.innerHeight - 60));
    sound.style.left = position.x + "px";
    sound.style.top = position.y + "px";
    var optionX = Math.max(12, Math.min(position.x + 24 - 113, window.innerWidth - 238));
    options.style.left = (optionX - position.x) + "px";
    options.style.right = "auto";
    if (!options.hidden) {
      var height = options.getBoundingClientRect().height;
      var above = position.y - 13 - height;
      var below = position.y + 61;
      var optionY = above >= 12 ? above : below + height <= window.innerHeight - 12 ? below : Math.max(12, Math.min(above, window.innerHeight - height - 12));
      options.style.top = (optionY - position.y) + "px";
      options.style.bottom = "auto";
    }
  }
  place(position.x, position.y);
  sound.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "touch") return;
    clearTimeout(closeTimer); hover = true; syncOpen();
  });
  sound.addEventListener("pointerleave", function () {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { hover = false; syncOpen(); }, 220);
  });
  sound.addEventListener("focusin", function () { if (keyNavigation) { keyboard = true; syncOpen(); } });
  sound.addEventListener("focusout", function () { queueMicrotask(function () { if (!sound.contains(document.activeElement)) { keyboard = false; syncOpen(); } }); });
  disc.addEventListener("click", function () {
    if (performance.now() < skipClickUntil) return;
    latched = !latched;
    if (!latched) { hover = false; keyboard = false; }
    syncOpen();
  });
  modes.forEach(function (button) {
    button.addEventListener("click", function () {
      kind = button.dataset.soundKind;
      sound.dataset.kind = kind;
      caption.textContent = names[kind];
      modes.forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
    });
    button.addEventListener("pointerenter", function () { caption.textContent = names[button.dataset.soundKind]; });
    button.addEventListener("pointerleave", function () { caption.textContent = names[kind]; });
    button.addEventListener("focus", function () { caption.textContent = names[button.dataset.soundKind]; });
    button.addEventListener("blur", function () { caption.textContent = names[kind]; });
  });
  function begin(id, x, y) { clearTimeout(closeTimer); drag = { id: id, x: x, y: y, startX: position.x, startY: position.y, active: false }; }
  function move(id, x, y) {
    if (!drag || drag.id !== id) return;
    var dx = x - drag.x, dy = y - drag.y;
    if (!drag.active && Math.hypot(dx, dy) <= 5) return;
    drag.active = true;
    setOpen(false);
    sound.classList.add("is-dragging");
    place(drag.startX + dx, drag.startY + dy);
  }
  function end(id) {
    if (!drag || drag.id !== id) return;
    var moved = drag.active;
    drag = null;
    sound.classList.remove("is-dragging");
    if (typeof id === "number" && disc.hasPointerCapture(id)) disc.releasePointerCapture(id);
    if (moved) { skipClickUntil = performance.now() + 350; close(); }
  }
  disc.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" || event.button !== 0 || !event.isPrimary) return;
    begin(event.pointerId, event.clientX, event.clientY);
    disc.setPointerCapture(event.pointerId);
  });
  disc.addEventListener("pointermove", function (event) { move(event.pointerId, event.clientX, event.clientY); });
  disc.addEventListener("pointerup", function (event) { end(event.pointerId); });
  disc.addEventListener("pointercancel", function (event) { end(event.pointerId); });
  disc.addEventListener("lostpointercapture", function () { if (drag) { drag = null; sound.classList.remove("is-dragging"); close(); } });
  // Some desktop input clients dispatch mouse events without pointer events.
  disc.addEventListener("mousedown", function (event) {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    disc.focus({ preventScroll: true });
    begin("mouse", event.clientX, event.clientY);
  });
  document.addEventListener("mousemove", function (event) { if (drag && drag.id === "mouse") { if (!(event.buttons & 1)) end("mouse"); else move("mouse", event.clientX, event.clientY); } });
  document.addEventListener("mouseup", function () { end("mouse"); });
  disc.addEventListener("keydown", function (event) {
    var step = event.shiftKey ? 36 : 12;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Home") { event.preventDefault(); place(window.innerWidth - 72, window.innerHeight - 76); }
    else if (moves[event.key]) { event.preventDefault(); place(position.x + moves[event.key][0], position.y + moves[event.key][1]); }
  });
  sound.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); disc.focus({ preventScroll: true }); close(); }
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Tab") keyNavigation = true; }, true);
  document.addEventListener("pointerdown", function (event) { keyNavigation = false; keyboard = false; if (!sound.contains(event.target)) close(); }, true);
  document.addEventListener("click", function (event) {
    // A drag ending over a navigation link must not activate that link.
    if (performance.now() < skipClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  document.addEventListener("rye:navigate", function () {
    if (sound.contains(document.activeElement)) document.querySelector(".panel.is-active h1, .panel.is-active .note-entry:not([hidden]) h2").focus({ preventScroll: true });
    if (drag) end(drag.id);
    close();
  });
  window.addEventListener("blur", function () { if (drag) end(drag.id); close(); });
  window.addEventListener("resize", function () { if (drag) end(drag.id); place(position.x, position.y); });
})();
