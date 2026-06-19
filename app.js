/* Flow — System Friction Log
 * A 10-second-a-day tracker. All data lives in localStorage; nothing leaves the device.
 */
(function () {
  "use strict";

  var STORE_KEY = "flow.friction.v1";
  var TREND_DAYS = 14;

  /* ---------- storage ---------- */
  // logs: { "YYYY-MM-DD": { score: 1-5, note: string } }
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function save(logs) {
    localStorage.setItem(STORE_KEY, JSON.stringify(logs));
  }

  /* ---------- date helpers ---------- */
  function todayKey(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function prettyDate(d) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  /* ---------- elements ---------- */
  var els = {
    date: document.getElementById("today-date"),
    dots: Array.prototype.slice.call(document.querySelectorAll(".dot")),
    note: document.getElementById("note"),
    savedHint: document.getElementById("saved-hint"),
    statusCard: document.getElementById("status-card"),
    statusIcon: document.getElementById("status-icon"),
    statusTitle: document.getElementById("status-title"),
    statusText: document.getElementById("status-text"),
    protocolToggle: document.getElementById("protocol-toggle"),
    protocol: document.getElementById("protocol"),
    chart: document.getElementById("chart"),
    avgPill: document.getElementById("avg-pill"),
    countLine: document.getElementById("count-line"),
    exportBtn: document.getElementById("export-btn"),
    resetBtn: document.getElementById("reset-btn"),
    remindTime: document.getElementById("remind-time"),
    calBtn: document.getElementById("cal-btn"),
    notifBtn: document.getElementById("notif-btn"),
    remindHint: document.getElementById("remind-hint"),
  };

  var logs = load();
  var key = todayKey();

  /* ---------- rendering ---------- */
  function render() {
    els.date.textContent = prettyDate(new Date());
    renderSelection();
    renderStatus();
    renderChart();
    renderFooter();
  }

  function renderSelection() {
    var entry = logs[key];
    var score = entry ? entry.score : null;
    els.dots.forEach(function (dot) {
      var match = Number(dot.dataset.score) === score;
      dot.setAttribute("aria-checked", match ? "true" : "false");
    });
    els.note.value = entry && entry.note ? entry.note : "";
  }

  // Returns the run of the most recent consecutive logged days (no gaps).
  function recentStreak() {
    var run = [];
    var cursor = new Date();
    for (var i = 0; i < 60; i++) {
      var k = todayKey(cursor);
      if (logs[k]) {
        run.push(logs[k].score);
      } else if (run.length > 0) {
        break; // gap ends the run, but only after it started
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return run; // most-recent first
  }

  function renderStatus() {
    var card = els.statusCard;
    card.classList.remove("warn", "alert");
    var run = recentStreak();
    var hasToday = !!logs[key];

    // Alert: a single 4 or 5 today, or three consecutive 4s.
    var threeFours = run.length >= 3 && run[0] >= 4 && run[1] >= 4 && run[2] >= 4;
    var single5 = run.length >= 1 && run[0] === 5;
    var single4 = run.length >= 1 && run[0] === 4;

    // Warn: three consecutive 3s (or worse).
    var threeThrees = run.length >= 3 && run[0] >= 3 && run[1] >= 3 && run[2] >= 3;

    var showProtocol = false;

    if (single5 || threeFours || single4) {
      card.classList.add("alert");
      els.statusIcon.textContent = "⚡";
      els.statusTitle.textContent = "Circuit breaker tripped";
      els.statusText.textContent = single5
        ? "A level 5 — total system rejection. Trigger a strategic reset day. Downshift now."
        : "Severe resistance. Mandatory downshift: pare to the bare minimum for 48 hours.";
      showProtocol = true;
    } else if (threeThrees) {
      card.classList.add("warn");
      els.statusIcon.textContent = "⚠️";
      els.statusTitle.textContent = "Early warning flare";
      els.statusText.textContent =
        "Three days of resistance in a row. Your system is starting to strain — lighten the load.";
      showProtocol = true;
    } else if (!hasToday) {
      els.statusIcon.textContent = "〰️";
      els.statusTitle.textContent = "Log today";
      els.statusText.textContent = "Tap a number above. Takes ten seconds.";
    } else {
      els.statusIcon.textContent = "✓";
      els.statusTitle.textContent = "All clear";
      els.statusText.textContent =
        run[0] <= 2
          ? "Steady. Keep logging — the signal builds over days."
          : "Logged. Watch the trend over the next few days.";
    }

    els.protocolToggle.hidden = !showProtocol;
    if (!showProtocol) {
      els.protocol.hidden = true;
      els.protocolToggle.textContent = "Show downshift protocol →";
    }
  }

  function renderChart() {
    els.chart.innerHTML = "";
    var cursor = new Date();
    cursor.setDate(cursor.getDate() - (TREND_DAYS - 1));
    var values = [];
    for (var i = 0; i < TREND_DAYS; i++) {
      var k = todayKey(cursor);
      values.push(logs[k] ? logs[k].score : null);
      cursor.setDate(cursor.getDate() + 1);
    }

    values.forEach(function (v) {
      var bar = document.createElement("div");
      bar.className = "bar";
      if (v == null) {
        bar.classList.add("empty");
        bar.style.height = "6px";
      } else {
        bar.dataset.s = String(v);
        bar.style.height = 20 + (v / 5) * 80 + "%";
        bar.title = v + "/5";
      }
      els.chart.appendChild(bar);
    });

    var logged = values.filter(function (v) {
      return v != null;
    });
    if (logged.length) {
      var avg =
        logged.reduce(function (a, b) {
          return a + b;
        }, 0) / logged.length;
      els.avgPill.textContent = "avg " + avg.toFixed(1);
    } else {
      els.avgPill.textContent = "—";
    }
  }

  function renderFooter() {
    var n = Object.keys(logs).length;
    els.countLine.textContent =
      n === 0 ? "No logs yet" : n + (n === 1 ? " day logged" : " days logged");
  }

  /* ---------- actions ---------- */
  function setScore(score) {
    var entry = logs[key] || {};
    entry.score = score;
    entry.note = els.note.value.trim();
    logs[key] = entry;
    save(logs);
    flashSaved();
    render();
  }

  function saveNote() {
    if (!logs[key]) return; // need a score first
    logs[key].note = els.note.value.trim();
    save(logs);
  }

  var flashTimer;
  function flashSaved() {
    els.savedHint.textContent = "Saved ✓";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      els.savedHint.textContent = "";
    }, 1600);
  }

  /* ---------- events ---------- */
  els.dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      setScore(Number(dot.dataset.score));
    });
  });

  els.note.addEventListener("change", saveNote);
  els.note.addEventListener("blur", saveNote);

  els.protocolToggle.addEventListener("click", function () {
    var open = !els.protocol.hidden;
    els.protocol.hidden = open;
    els.protocolToggle.textContent = open
      ? "Show downshift protocol →"
      : "Hide downshift protocol ↑";
  });

  els.exportBtn.addEventListener("click", function () {
    var rows = ["date,score,note"];
    Object.keys(logs)
      .sort()
      .forEach(function (k) {
        var e = logs[k];
        var note = (e.note || "").replace(/"/g, '""');
        rows.push(k + "," + e.score + ',"' + note + '"');
      });
    var blob = new Blob([rows.join("\n")], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "flow-friction-" + key + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  els.resetBtn.addEventListener("click", function () {
    if (confirm("Delete all friction logs? This can't be undone.")) {
      logs = {};
      save(logs);
      render();
    }
  });

  // Keyboard: press 1–5 to log today.
  document.addEventListener("keydown", function (e) {
    if (document.activeElement === els.note) return;
    if (e.key >= "1" && e.key <= "5") {
      setScore(Number(e.key));
    }
  });

  /* ---------- daily reminder ---------- */
  var REMIND_KEY = "flow.reminder.v1";
  var notifTimer;

  function loadReminder() {
    try {
      return JSON.parse(localStorage.getItem(REMIND_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveReminder(r) {
    localStorage.setItem(REMIND_KEY, JSON.stringify(r));
  }

  var reminder = loadReminder();
  if (reminder.time) els.remindTime.value = reminder.time;

  // Pad two digits and format a Date as a floating (local) iCalendar timestamp.
  function icsStamp(d) {
    function p(n) {
      return String(n).padStart(2, "0");
    }
    return (
      d.getFullYear() +
      p(d.getMonth() + 1) +
      p(d.getDate()) +
      "T" +
      p(d.getHours()) +
      p(d.getMinutes()) +
      "00"
    );
  }

  // Next occurrence of HH:MM (today if still ahead, else tomorrow).
  function nextOccurrence(hh, mm) {
    var now = new Date();
    var d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }

  function buildICS(hh, mm) {
    var start = nextOccurrence(hh, mm);
    var uid = "flow-daily-" + Date.now() + "@flow.app";
    var dtstamp =
      new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "") ; // UTC stamp with trailing Z
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Flow//Friction Log//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + dtstamp,
      "DTSTART:" + icsStamp(start),
      "DURATION:PT5M",
      "RRULE:FREQ=DAILY",
      "SUMMARY:Log today's friction 〰️",
      "DESCRIPTION:Open Flow and tap 1–5. Ten seconds. Spot the trend\\, not the day.",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Log today's friction",
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }

  function parseTime() {
    var parts = (els.remindTime.value || "21:00").split(":");
    return { hh: Number(parts[0]) || 21, mm: Number(parts[1]) || 0 };
  }

  els.calBtn.addEventListener("click", function () {
    var t = parseTime();
    reminder.time = els.remindTime.value;
    saveReminder(reminder);
    var ics = buildICS(t.hh, t.mm);
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "flow-daily-reminder.ics";
    a.click();
    URL.revokeObjectURL(url);
    els.remindHint.textContent =
      "Calendar file downloaded — open it and tap “Add” to set the daily repeat.";
  });

  // Best-effort in-app notification: fires while Flow is open/installed.
  function scheduleLocalNotification() {
    clearTimeout(notifTimer);
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!reminder.notif) return;
    var t = parseTime();
    var when = nextOccurrence(t.hh, t.mm).getTime() - Date.now();
    // setTimeout caps near 24.8 days; our window is always < 24h, so it's fine.
    notifTimer = setTimeout(function () {
      showReminderNotification();
      scheduleLocalNotification(); // re-arm for the next day
    }, Math.max(when, 0));
  }

  function showReminderNotification() {
    if (logs[todayKey()]) return; // already logged today — skip the nudge
    var opts = {
      body: "Tap 1–5. Ten seconds.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "flow-daily",
    };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(function (reg) {
          reg.showNotification("Log today's friction 〰️", opts);
        })
        .catch(function () {
          new Notification("Log today's friction 〰️", opts);
        });
    } else {
      new Notification("Log today's friction 〰️", opts);
    }
  }

  function renderNotifButton() {
    var supported = "Notification" in window;
    if (!supported) {
      els.notifBtn.textContent = "Notifications n/a";
      els.notifBtn.disabled = true;
      return;
    }
    if (Notification.permission === "granted" && reminder.notif) {
      els.notifBtn.textContent = "Notifications on";
      els.notifBtn.classList.add("on");
    } else if (Notification.permission === "denied") {
      els.notifBtn.textContent = "Notifications blocked";
      els.notifBtn.classList.remove("on");
    } else {
      els.notifBtn.textContent = "Enable notifications";
      els.notifBtn.classList.remove("on");
    }
  }

  els.notifBtn.addEventListener("click", function () {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      // Toggle off/on.
      reminder.notif = !reminder.notif;
      saveReminder(reminder);
      renderNotifButton();
      scheduleLocalNotification();
      if (reminder.notif) showReminderNotification(); // confirm it works
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm === "granted") {
        reminder.notif = true;
        reminder.time = els.remindTime.value;
        saveReminder(reminder);
        showReminderNotification();
        scheduleLocalNotification();
      }
      renderNotifButton();
    });
  });

  els.remindTime.addEventListener("change", function () {
    reminder.time = els.remindTime.value;
    saveReminder(reminder);
    scheduleLocalNotification();
  });

  renderNotifButton();
  scheduleLocalNotification();

  render();
})();
