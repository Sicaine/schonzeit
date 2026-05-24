import { useState, useRef, useCallback } from "react";

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];

function hIdx(m, d) { return (m - 1) * 2 + (d > 15 ? 1 : 0); }

function isActive(seasons, idx) {
  if (!seasons || seasons.length === 0) return false;
  for (const s of seasons) {
    const f = hIdx(s.fm, s.fd);
    const t = hIdx(s.tm, s.td);
    if (f <= t) { if (idx >= f && idx <= t) return true; }
    else { if (idx >= f || idx <= t) return true; }
  }
  return false;
}

function gridFromSeasons(seasons, yearRound) {
  if (yearRound === "hunting") return new Array(24).fill(true);
  if (yearRound === "protected") return new Array(24).fill(false);
  const g = new Array(24).fill(false);
  for (let i = 0; i < 24; i++) g[i] = isActive(seasons, i);
  return g;
}

function seasonsToStr(seasons) {
  return seasons.map(s =>
    `${String(s.fd).padStart(2,"0")}.${String(s.fm).padStart(2,"0")}-${String(s.td).padStart(2,"0")}.${String(s.tm).padStart(2,"0")}`
  );
}

function strToSeasons(arr) {
  return arr.map(s => {
    const [from, to] = s.split("-");
    const [fd, fm] = from.split(".").map(Number);
    const [td, tm] = to.split(".").map(Number);
    return { fm, fd, tm, td };
  });
}

let idCounter = 100;
function uid() { return `id_${idCounter++}_${Math.random().toString(36).slice(2,6)}`; }

// ─── Rank utilities ─────────────────────────────────────────────
function sortedByRank(items) { return [...items].sort((a, b) => (a.rank || 0) - (b.rank || 0)); }
function nextRank(items) { return !items || items.length === 0 ? 100 : Math.max(...items.map(i => i.rank || 0)) + 100; }
function calcMidpoint(a, b) { return Math.round((a + b) / 2); }
function assignRanks(items) { return items.map((item, i) => ({ ...item, rank: (i + 1) * 100 })); }
function assignDefaultRanks(data) {
  return { ...data, categories: data.categories.map((c, ci) => ({
    ...c, rank: (ci + 1) * 100,
    groups: c.groups.map((g, gi) => ({
      ...g, rank: (gi + 1) * 100,
      animals: g.animals.map((a, ai) => ({ ...a, rank: (ai + 1) * 100 }))
    }))
  }))};
}
function moveUp(items, itemId) {
  const sorted = sortedByRank(items);
  const idx = sorted.findIndex(i => i.id === itemId);
  if (idx <= 0) return items;
  const newRank = idx === 1 ? sorted[0].rank - 100 : calcMidpoint(sorted[idx - 2].rank, sorted[idx - 1].rank);
  return items.map(i => i.id === itemId ? { ...i, rank: newRank } : i);
}
function moveDown(items, itemId) {
  const sorted = sortedByRank(items);
  const idx = sorted.findIndex(i => i.id === itemId);
  if (idx < 0 || idx >= sorted.length - 1) return items;
  const newRank = idx === sorted.length - 2 ? sorted[sorted.length - 1].rank + 100 : calcMidpoint(sorted[idx + 1].rank, sorted[idx + 2].rank);
  return items.map(i => i.id === itemId ? { ...i, rank: newRank } : i);
}

function getDefaultData() {
  // Footnotes from schonzeit.txt
  const N1 = "Die Jagd ist auch in der Setzzeit erlaubt. (§ 19 Abs. 1 Satz 3 AVBayJG)";
  const N2 = "§ 3 der AAV muss berücksichtigt werden.";
  const N3 = "Ergänzung zu § 1 Abs. 2 der Bundesverordnung (JagdzeitV 1977). Für Waschbär und Marderhund gilt zudem, dass die Jagd auch in der Setzzeit erlaubt ist. (§ 19 Abs. 1 Satz 3 AVBayJG)";
  const N4 = "Der Biber ist nicht im BayJG und in der AVBayJG zu finden, aber aufgrund der AAV gibt es eine Ausnahmeregelung für die Jagd auf den Biber in Bayern. Die genauen rechtlichen Vorgaben sind § 2 AAV zu entnehmen.";
  const N5 = "Ausschließlich in einem Umkreis von 200 m um geschlossene Gewässer erlaubt. Die genauen Regeln sind der AVBayJG zu entnehmen. (§ 19 Abs. 2 AVBayJG)";
  const N6 = "Der Kormoran ist nicht im BayJG und im AVBayJG zu finden, aber die Tötung ist trotzdem erlaubt auf Basis der AAV. Insbesondere darf die Jagd maximal 200 Meter von einem Gewässer entfernt stattfinden. § 1 der AAV regelt die Details.";
  // Helper: a = animal factory
  const a = (names, yr, seasons, note, exam) => ({
    id: uid(), names: Array.isArray(names) ? names : [names],
    yearRound: yr, seasons: seasons || [], note: note || null, exam: !!exam,
  });
  const S = (fm,fd,tm,td) => [{ fm, fd, tm, td }];
  const S2 = (fm1,fd1,tm1,td1,fm2,fd2,tm2,td2) => [{ fm:fm1, fd:fd1, tm:tm1, td:td1 },{ fm:fm2, fd:fd2, tm:tm2, td:td2 }];

  return assignDefaultRanks({
    title: "Jagd- und Schonzeiten Bayern",
    huntingColor: "#3a7d32",
    categories: [
      {
        id: uid(), name: "Schalenwild",
        groups: [
          { id: uid(), name: "Rehwild", animals: [
            a("Böcke", null, S(4,16,10,15), null, true),
            a("Schmalrehe", null, S(4,16,1,15), null, true),
            a("Geißen", null, S(9,1,1,15)),
            a("Kitze", null, S(9,1,1,15)),
          ]},
          { id: uid(), name: "Rotwild", animals: [
            a("Hirsche", null, S(8,1,1,31)),
            a("Schmalspießer", null, S(6,1,1,31)),
            a("Schmaltiere", null, S(6,1,1,31)),
            a("Alttiere", null, S(8,1,1,31)),
            a("Kälber", null, S(8,1,1,31), null, true),
          ]},
          { id: uid(), name: "Damwild", animals: [
            a("Hirsche", null, S(9,1,1,31), null, true),
            a("Schmalspießer", null, S(7,1,1,31), null, true),
            a("Schmaltiere", null, S(7,1,1,31), null, true),
            a("Alttiere", null, S(9,1,1,31), null, true),
            a("Kälber", null, S(9,1,1,31), null, true),
          ]},
          { id: uid(), name: "Sikawild", animals: [
            a("Hirsche", null, S(9,1,1,31)),
            a("Schmalspießer", null, S(7,1,1,31)),
            a("Schmaltiere", null, S(7,1,1,31)),
            a("Alttiere", null, S(9,1,1,31)),
            a("Kälber", null, S(9,1,1,31)),
          ]},
          { id: uid(), name: "Gamswild", animals: [
            a("Gamswild", null, S(8,1,12,15), null, true),
          ]},
          { id: uid(), name: "Muffelwild", animals: [
            a("Muffelwild", null, S(8,1,1,31)),
          ]},
          { id: uid(), name: "Schwarzwild", animals: [
            a("Keiler", "hunting", null),
            a("Bachen", "hunting", null),
            a("Überläufer", "hunting", null),
            a("Frischlinge", "hunting", null, null, true),
          ]},
        ]
      },
      { id: uid(), type: "page-break", groups: [] },
      {
        id: uid(), name: "Raubwild",
        groups: [
          { id: uid(), name: "Fuchs", animals: [
            a("Fuchs", "hunting", null, null, true),
          ]},
          { id: uid(), name: "Dachs", animals: [
            a("Dachs juvenile", null, S(4,16,1,31), null, true),
            a("Dachs", null, S(8,1,1,31), null, true),
          ]},
          { id: uid(), name: "Marder", animals: [
            a("Baummarder", null, S(10,16,2,28), null, true),
            a("Steinmarder juvenile", null, S(6,1,2,28), null, true),
            a("Steinmarder", null, S(8,1,2,28), null, true),
            a("Mink (Amerikaner Nerz", null, S(1,1,12,31), null, true)
          ]},
          { id: uid(), name: "Kleine Raubsäuger", animals: [
            a("Hermelin", null, S(8,1,2,28)),
            a("Iltis", null, S(8,1,2,28)),
            a("Mauswiesel", null, S(8,1,2,28)),
          ]},
        ]
      },
      {
        id: uid(), name: "Neozoen",
        groups: [
          { id: uid(), name: "Waschbär", animals: [
            a("Waschbär", "hunting", null, N3),
          ]},
          { id: uid(), name: "Marderhund", animals: [
            a("Marderhund", "hunting", null, N3),
          ]},
          { id: uid(), name: "Nutria", animals: [
            a("Nutria", "hunting", null, N3),
          ]},
        ]
      },
      {
        id: uid(), name: "Niederwild",
        groups: [
          { id: uid(), name: "Feldhase", animals: [
            a("Feldhase", null, S(10,16,12,31), null, true),
          ]},
          { id: uid(), name: "Wildkaninchen", animals: [
            a("Wildkaninchen", "hunting", null, N1),
          ]},
          { id: uid(), name: "Biber", animals: [
            a("Biber", null, S(9,1,3,15), N4),
          ]},
        ]
      },
      { id: uid(), type: "page-break", groups: [] },
      {
        id: uid(), name: "Federwild – Enten",
        groups: [
          { id: uid(), name: "Wildenten", animals: [
            a("Stockente", null, S(9,1,1,15), null, true),
            a("Krickente", null, S(10,1,1,15), null, true),
            a("Pfeifente", null, S(10,1,1,15)),
            a("Spießente", null, S(10,1,1,15)),
            a("Bergente", null, S(10,1,1,15)),
            a("Reiherente", null, S(10,1,1,15)),
            a("Tafelente", null, S(10,1,1,15)),
            a("Samtente", null, S(10,1,1,15)),
            a("Trauerente", null, S(10,1,1,15)),
          ]},
        ]
      },
      {
        id: uid(), name: "Federwild – Gänse",
        groups: [
          { id: uid(), name: "Wildgänse", animals: [
            a("Graugans (jung, sitzend)", null, S(6,1,6,31), null, true),
            a("Graugans", null, S(8,1,2,28), null, true),
            a("Kanadagans (jung, sitzend)", null, S(6,1,6,31), null, true),
            a("Kanadagans", null, S(8,1,2,28), null, true),
            a("Nilgans", null, S(8,1,1,15)),
            a("Blässgans", null, S(11,1,1,15)),
            a("Ringelgans", null, S(11,1,1,15)),
            a("Saatgans", null, S(11,1,1,15)),
          ]},
        ]
      },
      {
        id: uid(), name: "Federwild – Hühnervögel",
        groups: [
          { id: uid(), name: "Fasan", animals: [
            a("Fasan", null, S(10,1,12,31), null, true),
          ]},
          { id: uid(), name: "Rebhuhn", animals: [
            a("Rebhuhn", null, S(9,1,10,31), null, true),
          ]},
          { id: uid(), name: "Wildtruthuhn", animals: [
            a("Wildtruthähne", null, S2(3,15,5,15, 10,1,1,15)),
            a("Wildtruthennen", null, S(10,1,1,15)),
          ]},
        ]
      },
      {
        id: uid(), name: "Federwild – Tauben",
        groups: [
          { id: uid(), name: "Wildtauben", animals: [
            a("Ringeltaube", null, S(11,1,2,20), null, true),
            a("Türkentaube", null, S(11,1,2,20)),
          ]},
        ]
      },
      {
        id: uid(), name: "Federwild – Sonstige",
        groups: [
          { id: uid(), name: "Waldschnepfe", animals: [
            a("Waldschnepfe", null, S(10,16,1,15), null, true),
          ]},
          { id: uid(), name: "Möwen", animals: [
            a("Lachmöwe", null, S(10,1,2,10)),
            a("Sturmmöwe", null, S(10,1,2,10)),
            a("Silbermöwe", null, S(10,1,2,10)),
            a("Heringsmöwe", null, S(10,1,2,10)),
            a("Mantelmöwe", null, S(10,1,2,10)),
          ]},
          { id: uid(), name: "Blässhuhn", animals: [
            a("Blässhuhn", null, S(9,11,2,20), null, true),
          ]},
          { id: uid(), name: "Graureiher", animals: [
            a("Graureiher", null, S(9,16,10,31), N5),
          ]},
          { id: uid(), name: "Höckerschwan", animals: [
            a("Höckerschwan", null, S(11,1,2,20)),
          ]},
          { id: uid(), name: "Kormoran", animals: [
            a("Kormoran", null, S(8,16,3,14), N6),
          ]},
        ]
      },
      {
        id: uid(), name: "Federwild – Rabenvögel",
        groups: [
          { id: uid(), name: "Rabenvögel", animals: [
            a("Rabenkrähe", null, S(7,16,3,14)),
            a("Eichelhäher", null, S(7,16,3,14)),
            a("Elster", null, S(7,16,3,14)),
          ]},
        ]
      },
      { id: uid(), type: "page-break", groups: [] },
      {
        id: uid(), name: "Ganzjährig geschützt",
        groups: [
          { id: uid(), name: "Schalenwild", animals: [
            a("Elchwild", "protected", null),
            a("Steinwild", "protected", null),
            a("Wisent", "protected", null),
          ]},
          { id: uid(), name: "Raubwild", animals: [
            a("Wildkatze", "protected", null),
            a("Luchs", "protected", null),
            a("Fischotter (Ausnahme Schaeden)", "protected", null, N2),
          ]},
          { id: uid(), name: "Niederwild", animals: [
            a("Schneehase", "protected", null, null, true),
            a("Murmeltier", "protected", null, null, true),
            a("Seehund", "protected", null),
          ]},
          { id: uid(), name: "Greifvögel", animals: [
            a("Greife", "protected", null),
            a("Falken", "protected", null),
          ]},
          { id: uid(), name: "Hühnervögel", animals: [
            a("Auerwild", "protected", null),
            a("Birkwild", "protected", null, null, true),
            a("Rackelwild", "protected", null),
            a("Haselwild", "protected", null, null, true),
            a("Alpenschneehuhn", "protected", null),
          ]},
          { id: uid(), name: "Sonstige", animals: [
            a("Kolkrabe", "protected", null, null, true),
            a("Haubentaucher", "protected", null),
            a("Säger", "protected", null),
            a("Großtrappe", "protected", null),
              a("Wachtel", "protected", null, null, true),
              a("Habicht", "protected", null, null, true),
              a("Silberreiher", "protected", null, null, true),
              a("Kolbenente", "protected", null, null, true),
          ]},
        ]
      },
    ]
  });
}

function displayName(a) { return a.names.join(", "); }

function toExportJSON(data) {
  return {
    title: data.title,
    huntingColor: data.huntingColor,
    categories: data.categories.map(c => {
      if (c.type === "page-break") return { type: "page-break", rank: c.rank };
      return {
        name: c.name, rank: c.rank,
        groups: c.groups.map(g => ({
          name: g.name, rank: g.rank,
          animals: g.animals.map(a => {
            const obj = { names: a.names, yearRound: a.yearRound, seasons: seasonsToStr(a.seasons), rank: a.rank };
            if (a.note) obj.note = a.note;
            if (a.exam) obj.exam = true;
            return obj;
          })
        }))
      };
    })
  };
}

function fromImportJSON(json) {
  const data = {
    title: json.title || "Jagdzeiten",
    huntingColor: json.huntingColor || "#3a7d32",
    categories: (json.categories || []).map(c => {
      if (c.type === "page-break") return { id: uid(), type: "page-break", rank: c.rank || 0, groups: [] };
      return {
        id: uid(), name: c.name, rank: c.rank || 0,
        groups: (c.groups || []).map(g => ({
          id: uid(), name: g.name, rank: g.rank || 0,
          animals: (g.animals || []).map(a => ({
            id: uid(),
            names: a.names || (a.name ? [a.name] : ["?"]),
            yearRound: a.yearRound || null,
            seasons: a.yearRound ? [] : strToSeasons(a.seasons || []),
            rank: a.rank || 0,
            note: a.note || null,
            exam: !!a.exam,
          }))
        }))
      };
    })
  };
  return data.categories.some(c => c.rank > 0) ? data : assignDefaultRanks(data);
}

const SORT_MODES = [
  { key: "default", label: "Standard" },
  { key: "jagdzeit_start", label: "Nach Jagdzeitbeginn" },
];

function getSortedAnimals(data, sortMode) {
  const rows = [];
  for (const cat of data.categories) {
    for (const grp of cat.groups) {
      for (const a of grp.animals) {
        rows.push({ cat: cat.name, grp: grp.name, animal: a, catId: cat.id, grpId: grp.id });
      }
    }
  }
  if (sortMode === "jagdzeit_start") {
    rows.sort((a, b) => {
      const aGrid = gridFromSeasons(a.animal.seasons, a.animal.yearRound);
      const bGrid = gridFromSeasons(b.animal.seasons, b.animal.yearRound);
      const aFirst = a.animal.yearRound === "protected" ? 99 : a.animal.yearRound === "hunting" ? -1 : aGrid.indexOf(true);
      const bFirst = b.animal.yearRound === "protected" ? 99 : b.animal.yearRound === "hunting" ? -1 : bGrid.indexOf(true);
      return aFirst - bFirst;
    });
  }
  return rows;
}

// ─── Cell background for a single month column ──────────────────
// h1 = first half active, h2 = second half active
function cellBg(h1, h2, color) {
  if (h1 && h2) return color;
  if (!h1 && !h2) return "#fff";
  // Fade: solid half → transparent half
  if (h1 && !h2) return `linear-gradient(to right, ${color} 40%, ${color}44 70%, #fff 100%)`;
  /* !h1 && h2 */ return `linear-gradient(to right, #fff 0%, ${color}44 30%, ${color} 60%)`;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@400;500;600&display=swap');

  :root {
    --hunt: #3a7d32;
    --bg: #faf8f4;
    --header-bg: #2c2c2c;
    --header-fg: #f0ede6;
    --group-bg: #f0ede6;
    --border: #d0ccc2;
    --text: #2c2c2c;
    --text-dim: #7a7568;
    --protect-bg: repeating-linear-gradient(45deg, #f5e6e6, #f5e6e6 3px, #faf0f0 3px, #faf0f0 6px);
    --cell-w: 52px;
    --cell-h: 22px;
    --name-w: 128px;
    --grp-w: 78px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Barlow', sans-serif; background: var(--bg); color: var(--text); }

  .app { max-width: 1100px; margin: 0 auto; padding: 12px; }

  .toolbar {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 8px 12px; background: #fff; border: 1px solid var(--border);
    border-radius: 6px; margin-bottom: 10px; font-size: 13px;
  }
  .toolbar button, .toolbar label {
    font-family: 'Barlow', sans-serif; font-size: 12px; font-weight: 500;
    padding: 4px 10px; border-radius: 4px; cursor: pointer;
    border: 1px solid var(--border); background: #fff; color: var(--text);
    transition: all .15s;
  }
  .toolbar button:hover { background: #f0ede6; }
  .toolbar .active { background: var(--hunt); color: #fff; border-color: var(--hunt); }
  .toolbar select {
    font-family: 'Barlow', sans-serif; font-size: 12px; padding: 4px 8px;
    border: 1px solid var(--border); border-radius: 4px; background: #fff;
  }
  .toolbar input[type="color"] { width: 28px; height: 24px; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 1px; }
  .spacer { flex: 1; }

  .poster { background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }

  .poster-title {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 18px; letter-spacing: 0.5px; text-transform: uppercase;
    padding: 10px 16px 6px; color: var(--text);
    border-bottom: 2px solid var(--text);
  }

  .legend {
    display: flex; gap: 14px; padding: 6px 16px; font-size: 11px;
    color: var(--text-dim); align-items: center; border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 4px; }
  .legend-swatch { width: 20px; height: 10px; border: 1px solid var(--border); border-radius: 2px; flex-shrink: 0; }

  .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .grid-table th, .grid-table td { border: 1px solid var(--border); padding: 0; text-align: center; }

  .apr-start { border-left: 2px solid #c06030 !important; }

  .month-header {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 600;
    font-size: 12px; letter-spacing: 0.3px; padding: 5px 0;
    background: var(--header-bg); color: var(--header-fg);
  }

  .cat-header td {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 13px; text-transform: uppercase; letter-spacing: 1px;
    padding: 5px 8px; background: var(--header-bg); color: var(--header-fg);
    text-align: left;
  }
  .grp-name {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 600;
    font-size: 11px; padding: 0 4px; background: var(--group-bg);
    color: var(--text); vertical-align: middle; text-align: left; line-height: 1.2;
  }
  .animal-name {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 500;
    font-size: 11.5px; padding: 1px 4px; text-align: left;
    background: #fff; vertical-align: middle; line-height: 1.15;
  }
  .exam-icon {
    display: inline-block; font-size: 7px; font-weight: 800;
    background: #800020; color: #fff; border-radius: 2px;
    padding: 0 2px; margin-right: 2px; vertical-align: middle;
    line-height: 1.4; letter-spacing: 0.3px;
  }
  .yr-toggle.is-exam { background: #305a8a; color: #fff; border-color: #305a8a; }
  .combined-names { font-size: 10px; line-height: 1.2; }
  .combined-names .cn-sep { color: var(--text-dim); }
  .single-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

  .cell {
    width: var(--cell-w); height: var(--cell-h); position: relative;
    font-family: 'Barlow Condensed', sans-serif; font-size: 9px;
    font-weight: 600; color: #fff; vertical-align: middle;
  }
  .cell.protected-cell { background: var(--protect-bg); }
  .cell .date-label {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: calc(var(--cell-h) * 0.9); font-weight: 700;
    line-height: 1; pointer-events: none;
    color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
  .cell .date-label.on-green {
    color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
  .cell .date-label.on-mixed {
    color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6), 0 0 5px rgba(0,0,0,0.3);
  }

  .yr-label {
    font-size: 8px; color: rgba(255,255,255,0.85); font-weight: 600;
    letter-spacing: 0.5px; white-space: nowrap;
  }
  .protected-label {
    font-size: 8px; color: #b05050; font-weight: 600;
    letter-spacing: 0.5px; white-space: nowrap;
  }

  .yr-toggle {
    font-size: 9px; cursor: pointer; padding: 1px 3px; border-radius: 2px;
    border: 1px solid var(--border); background: #fff;
    font-family: 'Barlow Condensed', sans-serif; color: var(--text-dim);
    flex-shrink: 0;
  }
  .yr-toggle:hover { background: #f0f0f0; }
  .yr-toggle.is-hunting { background: var(--hunt); color: #fff; border-color: var(--hunt); }
  .yr-toggle.is-protected { background: #d47070; color: #fff; border-color: #d47070; }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 999;
  }
  .modal {
    background: #fff; border-radius: 8px; padding: 20px; width: 500px;
    max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }
  .modal h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 16px; margin-bottom: 12px; }
  .modal textarea {
    width: 100%; height: 300px; font-family: monospace; font-size: 11px;
    border: 1px solid var(--border); border-radius: 4px; padding: 8px; resize: vertical;
  }
  .modal button {
    font-family: 'Barlow', sans-serif; font-size: 12px; padding: 6px 14px;
    border-radius: 4px; cursor: pointer; border: 1px solid var(--border);
    background: #fff; margin-top: 8px; margin-right: 6px;
  }
  .modal button.primary { background: var(--hunt); color: #fff; border-color: var(--hunt); }
  .modal .error { color: #c44; font-size: 12px; margin-top: 6px; }

  .footer-note {
    font-size: 10px; color: var(--text-dim); padding: 6px 16px;
    font-style: italic; border-top: 1px solid var(--border);
  }

  .editor-page-break {
    display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    padding: 8px 12px; border: 2px dashed #c06030; border-radius: 4px;
    background: #fff8f4; font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 13px; color: #c06030;
  }

  .view-toggle { display: flex; gap: 0; }
  .view-toggle button {
    font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600;
    padding: 4px 10px; cursor: pointer; border: 1px solid var(--border);
    background: #fff; color: var(--text); transition: all .15s;
  }
  .view-toggle button:first-child { border-radius: 4px 0 0 4px; }
  .view-toggle button:last-child { border-radius: 0 4px 4px 0; border-left: none; }
  .view-toggle button.active { background: var(--hunt); color: #fff; border-color: var(--hunt); }

  .editor-view {
    background: #fff; border: 1px solid var(--border); border-radius: 4px;
    padding: 12px; font-family: 'Barlow', sans-serif;
  }
  .editor-toolbar {
    display: flex; gap: 8px; align-items: center; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }
  .editor-toolbar button {
    font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 600;
    padding: 4px 12px; border-radius: 4px; cursor: pointer;
    border: 1px solid var(--border); background: #f0ede6;
  }
  .editor-toolbar button:hover { background: #e4e0d6; }
  .editor-cat {
    margin-bottom: 10px; border: 1px solid var(--border); border-radius: 4px; overflow: hidden;
  }
  .editor-cat-header {
    display: flex; align-items: center; gap: 6px; padding: 6px 8px;
    background: var(--header-bg); color: var(--header-fg);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 13px; text-transform: uppercase;
  }
  .editor-cat-header input {
    background: transparent; border: none; border-bottom: 1px dashed rgba(255,255,255,0.4);
    color: var(--header-fg); font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; text-transform: uppercase;
    flex: 1; outline: none; min-width: 0;
  }
  .editor-grp {
    margin: 6px 8px; border: 1px solid var(--border); border-radius: 4px;
    background: var(--group-bg);
  }
  .editor-grp-header {
    display: flex; align-items: center; gap: 6px; padding: 5px 8px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 600; font-size: 12px;
    border-bottom: 1px solid var(--border);
  }
  .editor-grp-header input {
    border: none; background: transparent; font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 12px; flex: 1; outline: none;
    border-bottom: 1px dashed #bbb; min-width: 0;
  }
  .editor-animal {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    padding: 4px 8px; border-bottom: 1px solid #e8e4dc; font-size: 12px;
  }
  .editor-animal:last-of-type { border-bottom: none; }
  .editor-animal input[type="text"] {
    border: 1px solid var(--border); border-radius: 3px; padding: 2px 6px;
    font-family: 'Barlow Condensed', sans-serif; font-size: 12px;
    outline: none; background: #fff;
  }
  .editor-animal input[type="text"]:focus { border-color: var(--hunt); }
  .editor-rank { font-size: 9px; color: var(--text-dim); font-family: monospace; min-width: 28px; text-align: right; }
  .editor-move-btn {
    font-size: 11px; padding: 1px 4px; border: 1px solid var(--border);
    border-radius: 3px; background: #fff; cursor: pointer;
    font-family: 'Barlow Condensed', sans-serif; line-height: 1;
  }
  .editor-move-btn:hover { background: #f0ede6; }
  .editor-del { font-size: 12px; color: #c44; cursor: pointer; background: none; border: none; font-weight: 700; padding: 0 2px; }
  .editor-del:hover { color: #a00; }
  .editor-add {
    font-size: 11px; color: var(--hunt); cursor: pointer; padding: 4px 8px;
    background: none; border: none; font-weight: 600; font-family: 'Barlow Condensed', sans-serif;
  }
  .editor-add:hover { text-decoration: underline; }
  .editor-select {
    font-size: 11px; padding: 1px 4px; border: 1px solid var(--border);
    border-radius: 3px; background: #fff; font-family: 'Barlow Condensed', sans-serif;
  }

  /* ─── B/W Print Mode (toggle + native print) ─────────────────── */
  .print-mode .poster, .print-mode .poster * { color: #222 !important; }
  .print-mode .poster { border-color: #999 !important; }
  .print-mode .poster-title { color: #000 !important; border-color: #000 !important; }
  .print-mode .legend { border-color: #ccc !important; color: #444 !important; }
  .print-mode .legend-swatch { border-color: #999 !important; }
  .print-mode .month-header {
    background: #fff !important; color: #000 !important;
    font-weight: 700 !important; border-color: #999 !important;
  }
  .print-mode .cat-header td {
    background: #f0f0f0 !important; color: #000 !important;
    border-color: #999 !important;
  }
  .print-mode .grp-name { background: #fafafa !important; color: #222 !important; }
  .print-mode .animal-name { background: #fff !important; color: #222 !important; }
  .print-mode .exam-icon { background: #222 !important; color: #fff !important; }
  .print-mode .grid-table th, .print-mode .grid-table td { border-color: #bbb !important; }
  .print-mode .cell { background: #fff !important; }
  .print-mode .cell-full {
    background: repeating-linear-gradient(45deg, #ddd, #ddd 2px, #fff 2px, #fff 5px) !important;
  }
  .print-mode .cell-h1 {
    background: linear-gradient(to right,
      repeating-linear-gradient(45deg, #ddd, #ddd 2px, #fff 2px, #fff 5px) 0% 50%,
      #fff 50% 100%) !important;
    background: linear-gradient(to right, #ccc 0%, #ccc 45%, #fff 55%, #fff 100%) !important;
  }
  .print-mode .cell-h2 {
    background: linear-gradient(to right, #fff 0%, #fff 45%, #ccc 55%, #ccc 100%) !important;
  }
  .print-mode .cell .date-label { color: #000 !important; text-shadow: none !important; font-weight: 800 !important; }
  .print-mode .cell .date-label.on-green { color: #000 !important; text-shadow: none !important; }
  .print-mode .cell .date-label.on-mixed { color: #000 !important; text-shadow: none !important; }
  .print-mode .yr-label { color: #444 !important; text-shadow: none !important; }
  .print-mode .protected-label { color: #888 !important; }
  .print-mode .protected-cell { background: #fff !important; }
  .print-mode .apr-start { border-left-color: #000 !important; }
  .print-mode .pb-section > tr:last-child > td { border-bottom: 3px dashed #c06030 !important; }
  .print-mode .footer-note { border-color: #ccc !important; color: #666 !important; }
  .print-mode .swatch-full { background: repeating-linear-gradient(45deg, #ddd, #ddd 2px, #fff 2px, #fff 5px) !important; }
  .print-mode .swatch-h1 { background: linear-gradient(to right, #ccc 0%, #ccc 35%, #fff 100%) !important; }
  .print-mode .swatch-h2 { background: linear-gradient(to right, #fff 0%, #ccc 65%, #ccc 100%) !important; }
  .print-mode .swatch-full span { color: #000 !important; }

  @media print {
    @page { size: landscape; margin: 6mm; }
    .pb-section { break-after: page; page-break-after: always; }
    .toolbar, .no-print, .editor-view { display: none !important; }
    .app { padding: 0; max-width: none; }
    .poster { border: none !important; border-radius: 0; }
    .poster-title { font-size: 14px; padding: 6px 10px 4px; color: #000 !important; border-color: #000 !important; }
    .legend { font-size: 9px; padding: 3px 10px; border-color: #ccc !important; color: #444 !important; }
    .month-header { background: #fff !important; color: #000 !important; font-weight: 700 !important; }
    .cat-header td { background: #f0f0f0 !important; color: #000 !important; }
    .grp-name { background: #fafafa !important; }
    .exam-icon { background: #000 !important; color: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .grid-table th, .grid-table td { border-color: #bbb !important; }
    .cell { background: #fff !important; }
    .cell-full {
      background: repeating-linear-gradient(45deg, #ddd, #ddd 2px, #fff 2px, #fff 5px) !important;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    .cell-h1 {
      background: linear-gradient(to right, #ccc 0%, #ccc 45%, #fff 55%, #fff 100%) !important;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    .cell-h2 {
      background: linear-gradient(to right, #fff 0%, #fff 45%, #ccc 55%, #ccc 100%) !important;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    .cell .date-label { color: #000 !important; text-shadow: none !important; }
    .yr-label { color: #444 !important; text-shadow: none !important; }
    .protected-label { color: #888 !important; }
    .protected-cell { background: #fff !important; }
    .apr-start { border-left: 2px solid #000 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .footer-note { border-color: #ccc !important; color: #666 !important; }
  }
`;

export default function SchonzeitApp() {
  const [data, setData] = useState(getDefaultData);
  const [viewMode, setViewMode] = useState("poster");
  const [sortMode, setSortMode] = useState("default");
  const [printMode, setPrintMode] = useState(false);
  const [pageBreaksEnabled, setPageBreaksEnabled] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const fileRef = useRef();

  const huntColor = data.huntingColor || "#3a7d32";

  const updateAnimal = useCallback((animalId, updater) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => ({
        ...c,
        groups: c.groups.map(g => ({
          ...g,
          animals: g.animals.map(a => a.id === animalId ? updater(a) : a)
        }))
      }))
    }));
  }, []);

  const updateGroup = useCallback((groupId, updater) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => ({
        ...c,
        groups: c.groups.map(g => g.id === groupId ? updater(g) : g)
      }))
    }));
  }, []);

  // ─── Editor callbacks ──────────────────────────────────────────
  const updateCategory = useCallback((catId, updater) => {
    setData(prev => ({ ...prev, categories: prev.categories.map(c => c.id === catId ? updater(c) : c) }));
  }, []);

  const addCategory = useCallback(() => {
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, {
        id: uid(), name: "Neue Kategorie", rank: nextRank(prev.categories),
        groups: [{ id: uid(), name: "Neue Gruppe", rank: 100, animals: [{ id: uid(), names: ["Neu"], yearRound: null, seasons: [], note: null, exam: false, rank: 100 }] }]
      }]
    }));
  }, []);

  const addPageBreak = useCallback(() => {
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, {
        id: uid(), type: "page-break", rank: nextRank(prev.categories), groups: []
      }]
    }));
  }, []);

  const removeCategory = useCallback((catId) => {
    setData(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== catId) }));
  }, []);

  const moveCatUp = useCallback((catId) => {
    setData(prev => ({ ...prev, categories: moveUp(prev.categories, catId) }));
  }, []);
  const moveCatDown = useCallback((catId) => {
    setData(prev => ({ ...prev, categories: moveDown(prev.categories, catId) }));
  }, []);
  const moveGrpUp = useCallback((catId, grpId) => {
    updateCategory(catId, c => ({ ...c, groups: moveUp(c.groups, grpId) }));
  }, [updateCategory]);
  const moveGrpDown = useCallback((catId, grpId) => {
    updateCategory(catId, c => ({ ...c, groups: moveDown(c.groups, grpId) }));
  }, [updateCategory]);
  const moveAnimalUp = useCallback((grpId, animalId) => {
    updateGroup(grpId, g => ({ ...g, animals: moveUp(g.animals, animalId) }));
  }, [updateGroup]);
  const moveAnimalDown = useCallback((grpId, animalId) => {
    updateGroup(grpId, g => ({ ...g, animals: moveDown(g.animals, animalId) }));
  }, [updateGroup]);

  const fixupAllRanks = useCallback(() => {
    setData(prev => ({
      ...prev,
      categories: assignRanks(sortedByRank(prev.categories)).map(c => ({
        ...c, groups: assignRanks(sortedByRank(c.groups)).map(g => ({
          ...g, animals: assignRanks(sortedByRank(g.animals))
        }))
      }))
    }));
  }, []);

  const moveAnimalToGroup = useCallback((animalId, fromGrpId, toGrpId) => {
    setData(prev => {
      let animal = null;
      const categories = prev.categories.map(c => ({
        ...c, groups: c.groups.map(g => {
          if (g.id === fromGrpId) {
            animal = g.animals.find(a => a.id === animalId);
            return { ...g, animals: g.animals.filter(a => a.id !== animalId) };
          }
          return g;
        })
      }));
      if (!animal) return prev;
      return { ...prev, categories: categories.map(c => ({
        ...c, groups: c.groups.map(g =>
          g.id === toGrpId ? { ...g, animals: [...g.animals, { ...animal, rank: nextRank(g.animals) }] } : g
        )
      }))};
    });
  }, []);

  const moveGroupToCategory = useCallback((grpId, fromCatId, toCatId) => {
    setData(prev => {
      let group = null;
      const categories = prev.categories.map(c => {
        if (c.id === fromCatId) {
          group = c.groups.find(g => g.id === grpId);
          return { ...c, groups: c.groups.filter(g => g.id !== grpId) };
        }
        return c;
      });
      if (!group) return prev;
      return { ...prev, categories: categories.map(c =>
        c.id === toCatId ? { ...c, groups: [...c.groups, { ...group, rank: nextRank(c.groups) }] } : c
      )};
    });
  }, []);

  const cycleYearRound = useCallback((animalId) => {
    updateAnimal(animalId, a => {
      const cycle = [null, "hunting", "protected"];
      const next = cycle[(cycle.indexOf(a.yearRound) + 1) % 3];
      if (next === "hunting" || next === "protected") return { ...a, yearRound: next, seasons: [] };
      return { ...a, yearRound: null, seasons: [] };
    });
  }, [updateAnimal]);

  const addAnimal = useCallback((groupId) => {
    updateGroup(groupId, g => ({
      ...g,
      animals: [...g.animals, { id: uid(), names: ["Neu"], yearRound: null, seasons: [], note: null, exam: false, rank: nextRank(g.animals) }]
    }));
  }, [updateGroup]);

  const removeAnimal = useCallback((groupId, animalId) => {
    updateGroup(groupId, g => ({
      ...g,
      animals: g.animals.filter(a => a.id !== animalId)
    }));
  }, [updateGroup]);

  const addGroup = useCallback((catId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId
          ? { ...c, groups: [...c.groups, { id: uid(), name: "Neue Gruppe", rank: nextRank(c.groups), animals: [{ id: uid(), names: ["Neu"], yearRound: null, seasons: [], note: null, exam: false, rank: 100 }] }] }
          : c
      )
    }));
  }, []);

  const removeGroup = useCallback((catId, groupId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId ? { ...c, groups: c.groups.filter(g => g.id !== groupId) } : c
      )
    }));
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(toExportJSON(data), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "schonzeiten.json"; a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importText);
      setData(fromImportJSON(parsed));
      setShowImport(false);
      setImportError("");
    } catch (e) { setImportError("Ungültiges JSON: " + e.message); }
  }, [importText]);

  const handleFileImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setData(fromImportJSON(parsed));
      } catch (err) { alert("Fehler beim Lesen: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // ─── Build rows ────────────────────────────────────────────────
  function buildDefaultRows() {
    const allRows = [];
    for (const cat of sortedByRank(data.categories)) {
      if (cat.type === "page-break") { allRows.push({ type: "page-break", cat }); continue; }
      allRows.push({ type: "cat", cat });
      for (const grp of sortedByRank(cat.groups)) {
        const animals = sortedByRank(grp.animals);
        const isSingle = animals.length === 1;
        animals.forEach((a, ai) => {
          allRows.push({ type: "animal", cat, grp, animal: a, isFirst: ai === 0, span: ai === 0 ? animals.length : 0, isSingle });
        });
      }
    }
    return allRows;
  }

  function buildSortedRows() {
    const sorted = getSortedAnimals(data, sortMode);
    const rows = [];
    let lastCat = null;
    for (const r of sorted) {
      if (r.cat !== lastCat) {
        rows.push({ type: "cat", cat: { name: r.cat } });
        lastCat = r.cat;
      }
      rows.push({ type: "animalFlat", cat: r.cat, grp: r.grp, animal: r.animal, grpId: r.grpId });
    }
    return rows;
  }

  const rows = sortMode === "default" ? buildDefaultRows() : buildSortedRows();

  // Split rows into sections at page breaks for print support
  const posterSections = [];
  let _secRows = [];
  for (const row of rows) {
    if (row.type === "page-break") {
      posterSections.push({ rows: _secRows, pageBreak: true });
      _secRows = [];
    } else {
      _secRows.push(row);
    }
  }
  posterSections.push({ rows: _secRows, pageBreak: false });

  // ─── Name display ─────────────────────────────────────────────
  function renderNames(a) {
    const noteMarker = a.note ? <span title={a.note} style={{ cursor: "help", color: "var(--hunt)", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>*</span> : null;
    const examStyle = a.exam ? { fontWeight: 700 } : {};
    const examIcon = a.exam ? <span className="exam-icon" title="Prüfungsrelevant">P</span> : null;
    if (a.names.length === 1) return <span className="single-name" style={examStyle}>{examIcon}{a.names[0]}{noteMarker}</span>;
    return (
      <span className="combined-names" style={examStyle}>
        {examIcon}
        {a.names.map((n, i) => (
          <span key={i}>{n}{i < a.names.length - 1 && <span className="cn-sep">, </span>}</span>
        ))}
        {noteMarker}
      </span>
    );
  }

  // ─── 12-column cell rendering (one cell per month) ─────────────
  function renderCells(animal) {
    const grid = gridFromSeasons(animal.seasons, animal.yearRound);

    if (animal.yearRound === "protected") {
      return Array.from({ length: 12 }, (_, mi) => (
        <td key={mi} className={`cell protected-cell${mi === 3 ? " apr-start" : ""}`}>
          {mi === 5 && <span className="protected-label">GESCHÜTZT</span>}
        </td>
      ));
    }

    if (animal.yearRound === "hunting") {
      return Array.from({ length: 12 }, (_, mi) => (
        <td key={mi} className={`cell cell-full${mi === 3 ? " apr-start" : ""}`} style={{ background: huntColor }}>
          {mi === 5 && <span className="yr-label">GANZJÄHRIG</span>}
        </td>
      ));
    }

    return Array.from({ length: 12 }, (_, mi) => {
      const h1 = grid[mi * 2];       // 1st–15th
      const h2 = grid[mi * 2 + 1];   // 16th–end

      const bg = cellBg(h1, h2, huntColor);
      const isGrad = (h1 && !h2) || (!h1 && h2);

      // Determine date labels for this month
      let label = null;
      let labelSide = null; // "left", "right", or "center"

      // Find boundary dates from the season definitions
      for (const s of animal.seasons) {
        // Season start falls in this month?
        if (s.fm === mi + 1 && s.fd !== 1) {
          label = s.fd;
          labelSide = s.fd <= 15 ? "left" : "right";
        }
        // Season end falls in this month?
        if (s.tm === mi + 1 && s.td !== MONTH_DAYS[mi]) {
          const endLabel = s.td;
          if (label && labelSide) {
            // Two labels in same month — show both
            if (s.td <= 15) {
              label = endLabel;
              labelSide = "left";
            } else {
              label = endLabel;
              labelSide = "right";
            }
          } else {
            label = endLabel;
            labelSide = endLabel <= 15 ? "left" : "right";
          }
        }
      }

      const labelClass = (h1 && h2) ? "on-green" : isGrad ? "on-mixed" : "";
      const fillClass = (h1 && h2) ? "cell-full" : (h1 && !h2) ? "cell-h1" : (!h1 && h2) ? "cell-h2" : "";

      return (
        <td
          key={mi}
          className={`cell ${fillClass}${mi === 3 ? " apr-start" : ""}`}
          style={{ background: bg }}
        >
          {label && (
            <div className={`date-label ${labelClass}`}>
              {label}
            </div>
          )}
        </td>
      );
    });
  }

  // ─── Main render ───────────────────────────────────────────────
  // 12 month cols + group col + name col = 14
  const colCount = 14;

  return (
    <>
      <style>{css}</style>
      <style>{`:root { --hunt: ${huntColor}; }`}</style>
      <div className={`app${printMode ? " print-mode" : ""}`}>
        <div className="toolbar no-print">
          <div className="view-toggle">
            <button className={viewMode === "poster" ? "active" : ""} onClick={() => setViewMode("poster")}>Poster</button>
            <button className={viewMode === "editor" ? "active" : ""} onClick={() => setViewMode("editor")}>Editor</button>
          </div>
          <span style={{ fontSize: 12, color: "#888" }}>|</span>
          {viewMode === "poster" && (
            <label style={{ display: "flex", alignItems: "center", gap: 4, border: "none", padding: 0 }}>
              <span style={{ fontSize: 11 }}>Sortierung:</span>
              <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
                {SORT_MODES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          )}
          <div className="spacer" />
          <button onClick={handleExport}>↓ Export</button>
          <button onClick={() => { setShowImport(true); setImportText(JSON.stringify(toExportJSON(data), null, 2)); }}>
            ↑ Import
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileImport} />
          <button onClick={() => fileRef.current?.click()}>📂 Datei</button>
          <button className={printMode ? "active" : ""} onClick={() => setPrintMode(p => !p)}>B/W</button>
          <button className={pageBreaksEnabled ? "active" : ""} onClick={() => setPageBreaksEnabled(p => !p)}
            title={pageBreaksEnabled ? "Seitenumbrüche aktiv (A4)" : "Poster-Modus (fortlaufend)"}>
            {pageBreaksEnabled ? "A4" : "Poster"}
          </button>
          <button onClick={() => window.print()}>🖨 Drucken</button>
        </div>

        {viewMode === "editor" && (
          <div className="editor-view">
            <div className="editor-toolbar">
              <button onClick={fixupAllRanks}>⟳ Fixup Ranks</button>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Normalisiert Ränge auf 100, 200, 300…</span>
            </div>
            {sortedByRank(data.categories).map(cat => {
              if (cat.type === "page-break") return (
                <div key={cat.id} className="editor-page-break">
                  <span style={{ flex: 1 }}>--- Seitenumbruch ---</span>
                  <span className="editor-rank" style={{ color: "#c06030" }}>{cat.rank}</span>
                  <button className="editor-move-btn" onClick={() => moveCatUp(cat.id)}>↑</button>
                  <button className="editor-move-btn" onClick={() => moveCatDown(cat.id)}>↓</button>
                  <button className="editor-del" onClick={() => removeCategory(cat.id)}>×</button>
                </div>
              );
              return (
              <div key={cat.id} className="editor-cat">
                <div className="editor-cat-header">
                  <input value={cat.name} onChange={e => updateCategory(cat.id, c => ({ ...c, name: e.target.value }))} />
                  <span className="editor-rank" style={{ color: "rgba(255,255,255,0.5)" }}>{cat.rank}</span>
                  <button className="editor-move-btn" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => moveCatUp(cat.id)}>↑</button>
                  <button className="editor-move-btn" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => moveCatDown(cat.id)}>↓</button>
                  <button className="editor-del" style={{ color: "#f88" }} onClick={() => removeCategory(cat.id)}>×</button>
                </div>
                {sortedByRank(cat.groups).map(grp => (
                  <div key={grp.id} className="editor-grp">
                    <div className="editor-grp-header">
                      <input value={grp.name} onChange={e => updateGroup(grp.id, g => ({ ...g, name: e.target.value }))} />
                      <span className="editor-rank">{grp.rank}</span>
                      <button className="editor-move-btn" onClick={() => moveGrpUp(cat.id, grp.id)}>↑</button>
                      <button className="editor-move-btn" onClick={() => moveGrpDown(cat.id, grp.id)}>↓</button>
                      <select className="editor-select" value={cat.id}
                        onChange={e => { if (e.target.value !== cat.id) moveGroupToCategory(grp.id, cat.id, e.target.value); }}
                        title="Gruppe in andere Kategorie verschieben">
                        {sortedByRank(data.categories).filter(c => c.type !== "page-break").map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button className="editor-del" onClick={() => removeGroup(cat.id, grp.id)}>×</button>
                    </div>
                    <div style={{ padding: "2px 0" }}>
                      {sortedByRank(grp.animals).map(a => (
                        <div key={a.id} className="editor-animal">
                          <input type="text" value={a.names.join(", ")} style={{ flex: "1 1 120px", minWidth: 0 }}
                            onChange={e => {
                              const names = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                              updateAnimal(a.id, x => ({ ...x, names: names.length > 0 ? names : ["?"] }));
                            }}
                            title="Komma-getrennt für mehrere Tiere"
                          />
                          <button
                            className={`yr-toggle ${a.yearRound === "hunting" ? "is-hunting" : a.yearRound === "protected" ? "is-protected" : ""}`}
                            onClick={() => cycleYearRound(a.id)}
                            style={{ fontSize: 10 }}
                          >
                            {a.yearRound === "hunting" ? "GJ Jagd" : a.yearRound === "protected" ? "Geschützt" : "Saisonal"}
                          </button>
                          <button
                            className={`yr-toggle${a.exam ? " is-exam" : ""}`}
                            onClick={() => updateAnimal(a.id, x => ({ ...x, exam: !x.exam }))}
                            style={{ fontSize: 10 }}
                            title="Prüfungsrelevant"
                          >
                            {a.exam ? "P ✓" : "P"}
                          </button>
                          {!a.yearRound && (
                            <input type="text" style={{ width: 140, fontSize: 11 }}
                              value={seasonsToStr(a.seasons).join(", ")}
                              placeholder="TT.MM-TT.MM"
                              onChange={e => {
                                try {
                                  const parts = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                  if (parts.length === 0) { updateAnimal(a.id, x => ({ ...x, seasons: [] })); return; }
                                  const seasons = strToSeasons(parts);
                                  updateAnimal(a.id, x => ({ ...x, seasons }));
                                } catch (err) { /* ignore parse errors while typing */ }
                              }}
                            />
                          )}
                          <span className="editor-rank">{a.rank}</span>
                          <button className="editor-move-btn" onClick={() => moveAnimalUp(grp.id, a.id)}>↑</button>
                          <button className="editor-move-btn" onClick={() => moveAnimalDown(grp.id, a.id)}>↓</button>
                          <select className="editor-select" value={grp.id}
                            onChange={e => { if (e.target.value !== grp.id) moveAnimalToGroup(a.id, grp.id, e.target.value); }}
                            title="Tier in andere Gruppe verschieben">
                            {data.categories.filter(c => c.type !== "page-break").flatMap(c => sortedByRank(c.groups).map(g => (
                              <option key={g.id} value={g.id}>{c.name} › {g.name}</option>
                            )))}
                          </select>
                          <button className="editor-del" onClick={() => removeAnimal(grp.id, a.id)}>×</button>
                          {a.note && (
                            <div style={{ width: "100%", marginTop: 2 }}>
                              <input type="text" value={a.note} style={{ width: "100%", fontSize: 10, color: "var(--text-dim)", fontStyle: "italic" }}
                                onChange={e => updateAnimal(a.id, x => ({ ...x, note: e.target.value || null }))}
                                title="Rechtlicher Hinweis"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      <button className="editor-add" onClick={() => addAnimal(grp.id)}>+ Tier hinzufügen</button>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "4px 8px" }}>
                  <button className="editor-add" onClick={() => addGroup(cat.id)}>+ Gruppe hinzufügen</button>
                </div>
              </div>
              );
            })}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="editor-add" onClick={addCategory} style={{ fontSize: 13, padding: "8px 12px" }}>+ Kategorie hinzufügen</button>
              <button className="editor-add" onClick={addPageBreak} style={{ fontSize: 13, padding: "8px 12px", color: "#c06030" }}>+ Seitenumbruch</button>
            </div>
          </div>
        )}

        {viewMode === "poster" && <div className="poster">
          <div className="poster-title">{data.title}</div>

          <div className="legend">
            <div className="legend-item">
              <div className="legend-swatch swatch-full" style={{ background: huntColor }} />
              <span>Jagdzeit (ganzer Monat)</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch swatch-h1" style={{ background: `linear-gradient(to right, ${huntColor} 35%, #fff 100%)` }} />
              <span>1.–15.</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch swatch-h2" style={{ background: `linear-gradient(to right, #fff 0%, ${huntColor} 65%)` }} />
              <span>16.–Ende</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "#fff" }} />
              <span>Schonzeit</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch swatch-full" style={{ background: huntColor, position: "relative" }}>
                <span style={{ fontSize: 7, color: "#fff", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>GJ</span>
              </div>
              <span>Ganzjährig</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: "repeating-linear-gradient(45deg, #f5e6e6, #f5e6e6 2px, #faf0f0 2px, #faf0f0 4px)" }} />
              <span>Geschützt</span>
            </div>
          </div>

          <table className="grid-table">
            <colgroup>
              <col style={{ width: "var(--grp-w)" }} />
              <col style={{ width: "var(--name-w)" }} />
              {Array.from({ length: 12 }, (_, i) => <col key={i} style={{ width: "var(--cell-w)" }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="month-header" />
                <th className="month-header" />
                {MONTHS.map((m, i) => (
                  <th key={i} className={`month-header${i === 3 ? " apr-start" : ""}`}>{m}</th>
                ))}
              </tr>
            </thead>
            {posterSections.map((section, si) => (
            <tbody key={si} className={section.pageBreak && pageBreaksEnabled ? "pb-section" : ""}>
              {section.rows.map((row, ri) => {
                if (row.type === "cat") {
                  return (
                    <tr key={`cat-${ri}`} className="cat-header">
                      <td colSpan={colCount}>{row.cat.name}</td>
                    </tr>
                  );
                }
                if (row.type === "animalFlat") {
                  const a = row.animal;
                  return (
                    <tr key={`af-${ri}`}>
                      <td className="grp-name">{row.grp}</td>
                      <td className="animal-name" title={displayName(a)}>
                        {renderNames(a)}
                      </td>
                      {renderCells(a)}
                    </tr>
                  );
                }
                const a = row.animal;
                return (
                  <tr key={`a-${ri}`}>
                    {row.isSingle ? (
                      <td className="animal-name" colSpan={2} style={{ textAlign: "center", ...(a.exam ? { fontWeight: 700 } : {}) }}>
                        {a.exam && <span className="exam-icon" title="Prüfungsrelevant">P</span>}
                        {row.grp.name || displayName(a)}
                        {a.note && <span title={a.note} style={{ cursor: "help", color: "var(--hunt)", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>*</span>}
                      </td>
                    ) : (
                      <>
                        {row.isFirst && row.span > 0 && (
                          <td className="grp-name" rowSpan={row.span}>
                            {row.grp.name}
                          </td>
                        )}
                        <td className="animal-name">
                          {renderNames(a)}
                        </td>
                      </>
                    )}
                    {renderCells(a)}
                  </tr>
                );
              })}
            </tbody>
            ))}
          </table>

          <div className="footer-note">
            Angaben ohne Gewähr – Bitte aktuelle Verordnungen prüfen.
          </div>
        </div>}
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>JSON Import / Export</h3>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} />
            {importError && <div className="error">{importError}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="primary" onClick={handleImport}>Importieren</button>
              <button onClick={() => { navigator.clipboard.writeText(importText); }}>Kopieren</button>
              <button onClick={() => setShowImport(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
