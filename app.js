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
    importBtn: document.getElementById("import-btn"),
    importFile: document.getElementById("import-file"),
    exportBtn: document.getElementById("export-btn"),
    resetBtn: document.getElementById("reset-btn"),
    logDate: document.getElementById("log-date"),
  };

  var logs = load();
  var selectedKey = todayKey();

  /* ---------- rendering ---------- */
  function render() {
    renderDate();
    renderSelection();
    renderStatus();
    renderChart();
    renderFooter();
  }

  var LABELS = { 1: "Flow", 2: "Normal", 3: "Resistance", 4: "Stuck", 5: "Crash" };

  function renderDate() {
    els.logDate.value = selectedKey;
    els.logDate.max = todayKey(); // no logging the future
    var d = new Date(selectedKey + "T00:00:00");
    var isToday = selectedKey === todayKey();
    els.date.textContent = prettyDate(d) + (isToday ? " · Today" : "");
  }

  function renderSelection() {
    var entry = logs[selectedKey];
    var score = entry ? entry.score : null;
    els.dots.forEach(function (dot) {
      var match = Number(dot.dataset.score) === score;
      dot.setAttribute("aria-checked", match ? "true" : "false");
    });
    els.note.value = entry && entry.note ? entry.note : "";
    // Persistent feedback line under the scale (flashSaved overrides briefly).
    els.savedHint.textContent = score ? "Logged · " + score + " " + LABELS[score] : "";
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
    var hasToday = !!logs[todayKey()];

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
    var entry = logs[selectedKey] || {};
    entry.score = score;
    entry.note = els.note.value.trim();
    logs[selectedKey] = entry;
    save(logs);
    render();
    flashSaved();
  }

  function saveNote() {
    if (!logs[selectedKey]) return; // need a score first
    logs[selectedKey].note = els.note.value.trim();
    save(logs);
  }

  var flashTimer;
  function flashSaved() {
    els.savedHint.textContent = "Saved ✓";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      renderSelection(); // restore the persistent "Logged · N Label" line
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
    a.download = "flow-friction-" + todayKey() + ".csv";
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

  // Keyboard: press 1–5 to log the selected day.
  document.addEventListener("keydown", function (e) {
    if (document.activeElement === els.note || document.activeElement === els.logDate) return;
    if (e.key >= "1" && e.key <= "5") {
      setScore(Number(e.key));
    }
  });

  /* ---------- date selection ---------- */
  els.logDate.addEventListener("change", function () {
    var v = els.logDate.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      els.logDate.value = selectedKey;
      return;
    }
    if (v > todayKey()) v = todayKey(); // clamp future to today
    selectedKey = v;
    render();
  });

  /* ---------- import ---------- */
  function parseCSVLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function addEntry(date, score, note) {
    if (!DATE_RE.test(date)) return false;
    score = Number(score);
    if (!(score >= 1 && score <= 5)) return false;
    logs[date] = { score: score, note: String(note || "").slice(0, 24) };
    return true;
  }

  // Accepts Flow's CSV export or its JSON backup; merges into existing logs.
  function importData(text) {
    text = text.trim();
    var added = 0;
    if (text.charAt(0) === "{") {
      var obj = JSON.parse(text);
      Object.keys(obj).forEach(function (k) {
        var e = obj[k] || {};
        if (addEntry(k, e.score, e.note)) added++;
      });
    } else {
      text.split(/\r?\n/).forEach(function (line) {
        if (!line.trim()) return;
        var f = parseCSVLine(line);
        if (String(f[0]).trim().toLowerCase() === "date") return; // header
        if (addEntry(String(f[0]).trim(), f[1], (f[2] || "").trim())) added++;
      });
    }
    return added;
  }

  els.importBtn.addEventListener("click", function () {
    els.importFile.click();
  });

  els.importFile.addEventListener("change", function () {
    var file = els.importFile.files && els.importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var n = 0;
      try {
        n = importData(String(reader.result));
      } catch (err) {
        n = -1;
      }
      els.importFile.value = "";
      if (n < 0) {
        alert("Couldn't read that file. Use a CSV or JSON exported from Flow.");
        return;
      }
      save(logs);
      render();
      els.countLine.textContent =
        n === 0 ? "Nothing to import" : "Imported " + n + (n === 1 ? " day ✓" : " days ✓");
      setTimeout(renderFooter, 2500);
    };
    reader.readAsText(file);
  });

  render();
})();
