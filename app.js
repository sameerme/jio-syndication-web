// JIO Syndication Form — client-side port of server.py.
// Everything (renaming, CSV rewriting, zipping) happens in the browser;
// nothing is ever sent anywhere. Submit builds output/*.{jpg,csv} in memory
// and downloads them as output.zip.

const SERIALS = [
  { key: "ab", name: "Atuta Bandhana" },
  { key: "bb", name: "Bada Bohu" },
  { key: "emm", name: "E Mana Manena" },
  { key: "od", name: "Odhani" },
  { key: "msra", name: "Mo Sindurara Adhikara" },
  { key: "tptp", name: "Tori Pain To Pain" },
];

// Global variable prefixes, keyed by the form field key (mirrors server.py PREFIXES).
const PREFIXES = {
  ab: "Atuta_Bandhana_EP",
  bb: "Bada_Bohu_EP",
  emm: "E_Mana_Manena_EP",
  od: "Odhani_EP",
  msra: "Mo_Sindurara_Adhikara_EP",
  tptp: "Tori_Pain_To_Pain_EP",
};

// ---- Row rendering ---------------------------------------------------

const grid = document.querySelector(".grid");

SERIALS.forEach(({ name }, i) => {
  const idx = i + 1;

  const serial = document.createElement("div");
  serial.className = "serial";
  serial.innerHTML = `<span class="serial__num">${idx}</span><span>${name}</span>`;

  const number = document.createElement("input");
  number.className = "field";
  number.type = "number";
  number.name = `value_${idx}`;
  number.inputMode = "decimal";
  number.placeholder = "0";
  number.setAttribute("aria-label", `${name} value`);

  const notes = document.createElement("textarea");
  notes.className = "field field--area";
  notes.name = `notes_${idx}`;
  notes.rows = 1;
  notes.placeholder = "Add notes…";
  notes.setAttribute("aria-label", `${name} notes`);

  grid.append(serial, number, notes);
});

grid.addEventListener("input", (e) => {
  const el = e.target;
  if (el.classList.contains("field--area")) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }
});

// ---- CSV parsing / serializing (RFC4180-ish, matches Python's csv module) --

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore; the following \n closes the row
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvField(value) {
  if (/["\r\n,]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function serializeCSV(rows) {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

// ---- Rename logic (mirrors server.py `renamed`) -----------------------

function renamed(filename, values) {
  for (const key of Object.keys(PREFIXES)) {
    const prefix = PREFIXES[key];
    if (filename.startsWith(prefix)) {
      const value = values[key] || "";
      return prefix + value + filename.slice(prefix.length);
    }
  }
  return filename;
}

// ---- CSV row update (mirrors server.py `update_output_csvs`) ----------

function buildUpdatedCSV(originalText, key, value, note) {
  const rows = parseCSV(originalText);
  if (rows.length < 2) return originalText;

  const header = rows[0];
  const prefix = PREFIXES[key];
  const updates = {
    FileName: prefix + value,
    EpisodeName: "Episode" + value,
    EpisodeSynopsis: note,
    EpisodeNumber: value,
  };
  for (const [column, newValue] of Object.entries(updates)) {
    const idx = header.indexOf(column);
    if (idx !== -1) rows[1][idx] = newValue;
  }
  return serializeCSV(rows);
}

// ---- Submit handler -----------------------------------------------------

const form = document.getElementById("entryForm");
const btn = form.querySelector(".btn");
const status = document.getElementById("status");

function setStatus(text, state) {
  status.textContent = text;
  if (state) status.setAttribute("data-state", state);
  else status.removeAttribute("data-state");
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const values = {};
  const notes = {};
  SERIALS.forEach(({ key }, i) => {
    values[key] = form[`value_${i + 1}`].value.trim();
    notes[key] = form[`notes_${i + 1}`].value.trim();
  });

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Processing…";
  setStatus("Building output…");

  try {
    const zip = new JSZip();
    const outFolder = zip.folder("output");
    let fileCount = 0;
    const newVars = {};
    SERIALS.forEach(({ key }) => {
      newVars[key] = PREFIXES[key] + (values[key] || "");
    });

    for (const filename of Object.keys(ASSETS)) {
      const asset = ASSETS[filename];
      const key = Object.keys(PREFIXES).find((k) => filename.startsWith(PREFIXES[k]));
      const dstName = renamed(filename, values);

      if (asset.kind === "image") {
        outFolder.file(dstName, asset.b64, { base64: true });
      } else {
        const note = key ? notes[key] || "" : "";
        const value = key ? values[key] || "" : "";
        const newText = key ? buildUpdatedCSV(asset.text, key, value, note) : asset.text;
        outFolder.file(dstName, newText);
      }
      fileCount++;
    }

    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, "output.zip");

    const lines = Object.entries(newVars)
      .map(([k, v]) => `${k} → ${v}`)
      .join(", ");
    setStatus(`Done — ${fileCount} files in output.zip (${lines})`, "ok");
  } catch (err) {
    console.error(err);
    setStatus("Error: " + err.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});
