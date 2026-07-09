@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/*
  Omni Messenger Lord V4 ULTRA popup stylesheet
  ------------------------------------------------
  This file intentionally explains the UI styling because the popup has many
  high-powered audio presets. Preset buttons stay clean and compact while the
  detailed slider values remain in the controls below.
*/

:root {
  color-scheme: dark;

  /* Base popup palette. Theme-specific values are swapped by body[data-theme]. */
  --bg-a: #020202;
  --bg-b: #0b0813;
  --glass: rgba(10, 10, 15, 0.84);
  --line: rgba(255, 255, 255, 0.11);
  --text: #f8f6f2;
  --muted: rgba(248, 246, 242, 0.68);
  --gold: #f6d365;
  --pink: #ff7eb6;
  --violet: #b388ff;
  --cyan: #67e8f9;
  --green: #6dff9b;
  --danger: #ffbe55;
  --panel-glow: rgba(246, 211, 101, 0.28);

}

* { box-sizing: border-box; }

html { background: #020202; }

body {
  width: min(380px, 100vw);
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at 15% 0%, rgba(246, 211, 101, 0.16), transparent 32%),
    radial-gradient(circle at 90% 20%, rgba(179, 136, 255, 0.16), transparent 34%),
    radial-gradient(circle at 50% 100%, rgba(103, 232, 249, 0.11), transparent 42%),
    linear-gradient(145deg, var(--bg-a), #08060f, var(--bg-b));
}

/* Active preset themes. popup.js sets data-theme after preset selection. */
body[data-theme="royal"] {
  --gold: #39ff88;
  --pink: #22d3ee;
  --violet: #14b8a6;
  --panel-glow: rgba(57, 255, 136, 0.25);
}

body[data-theme="lord"] {
  --gold: #fff01f;
  --pink: #ff3d00;
  --violet: #ffd400;
  --panel-glow: rgba(255, 224, 0, 0.33);
}

body[data-theme="ultraQuetta"] {
  --gold: #00d9ff;
  --pink: #0ff0ff;
  --violet: #00e5ff;
  --panel-glow: rgba(0, 217, 255, 0.42);
}

.panel {
  position: relative;
  margin: 10px;
  padding: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 26px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(10, 10, 15, 0.9));
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(22px);
}

.panel::before,
.panel::after {
  content: "";
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
}

.panel::before {
  inset: -70px -45px auto auto;
  width: 170px;
  height: 170px;
  background: radial-gradient(circle, var(--panel-glow), transparent 66%);
}

.panel::after {
  inset: auto auto -90px -55px;
  width: 210px;
  height: 210px;
  background: radial-gradient(circle, rgba(103, 232, 249, 0.13), transparent 68%);
}

.hero,
.sectionTitle,
.field,
.checkField,
.presets,
.controls,
footer { position: relative; z-index: 1; }

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-shadow: 0 0 12px color-mix(in srgb, var(--gold) 72%, transparent);
}

h1 {
  margin: 0;
  font-size: 29px;
  line-height: 0.95;
  letter-spacing: -0.045em;
  font-weight: 800;
  background: linear-gradient(90deg, #fff, var(--gold), var(--pink), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 12px rgba(246, 211, 101, 0.35), 0 0 24px rgba(255, 126, 182, 0.22);
}

h2 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fff;
}

.switch {
  position: relative;
  display: inline-flex;
  width: 58px;
  height: 34px;
  flex: 0 0 auto;
}

.switch input {
  position: absolute;
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.28);
  transition: background 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.slider::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.35);
  transition: transform 0.22s ease;
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, var(--gold), var(--pink));
  box-shadow: 0 0 26px color-mix(in srgb, var(--gold) 42%, transparent);
}

.switch input:checked + .slider::after { transform: translateX(24px); }

.status {
  margin: 12px 0;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 14px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 800;
}

.status.ok {
  color: #dcfce7;
  background: rgba(34, 197, 94, 0.22);
  border-color: rgba(57, 255, 136, 0.35);
}

.status.warn {
  color: #fff7d6;
  background: rgba(255, 176, 32, 0.18);
  border-color: rgba(255, 209, 102, 0.32);
}

.presets {
  margin: 0 0 10px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.075);
}

.sectionTitle {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.sectionTitle span,
.hint,
footer {
  color: var(--muted);
  font-size: 11px;
}

.presetGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  margin-top: 10px;
}

.preset {
  position: relative;
  min-height: 74px;
  padding: 11px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, border-color 0.18s ease;
}

.preset::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0 35%, rgba(255, 255, 255, 0.12) 48%, transparent 62%);
  transform: translateX(-110%);
  transition: transform 0.35s ease;
}

.preset strong,
.preset small { display: block; position: relative; z-index: 1; }

.preset strong {
  font-size: 17px;
  letter-spacing: -0.04em;
}

.preset small {
  margin-top: 4px;
  opacity: 0.84;
  font-weight: 800;
}

.preset:hover {
  transform: translateY(-1px);
  filter: saturate(1.18);
}

.preset:hover::before { transform: translateX(110%); }
.preset:active { transform: translateY(1px) scale(0.99); }

.preset.royal { background: linear-gradient(135deg, #06120d, #0b3026, #39ff88); }
.preset.lord { background: linear-gradient(135deg, #140c00, #2b1800, #ffd700); }
.preset.ultraQuetta { background: linear-gradient(135deg, #001923, #00455f, #00d9ff); }

.preset.active,
.preset[aria-pressed="true"] {
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18), 0 0 34px color-mix(in srgb, var(--gold) 64%, transparent);
}

.preset.active strong::after,
.preset[aria-pressed="true"] strong::after {
  content: "  ✓";
  font-weight: 900;
}

.preset.royal.active,
.preset.royal[aria-pressed="true"] {
  color: #03251d;
  background: linear-gradient(135deg, #39ff88, #22d3ee);
}

.preset.lord.active,
.preset.lord[aria-pressed="true"] {
  color: #2d2100;
  background: linear-gradient(135deg, #fff01f, #ffd400);
}

.preset.ultraQuetta.active,
.preset.ultraQuetta[aria-pressed="true"] {
  color: #002b3d;
  background: linear-gradient(135deg, #00d9ff, #0ff0ff);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2), 0 0 28px rgba(0, 217, 255, 0.75), 0 0 45px rgba(0, 217, 255, 0.45), inset 0 0 12px rgba(0, 217, 255, 0.3);
}


.hint {
  margin: 9px 0 0;
  line-height: 1.35;
}

.controls {
  display: grid;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.controls::-webkit-scrollbar { width: 6px; }
.controls::-webkit-scrollbar-track { background: transparent; }
.controls::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 6px; }
.controls::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

.checkField {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 15px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  user-select: none;
}

.checkField input { accent-color: var(--gold); }

.field {
  display: grid;
  grid-template-columns: 1fr 112px;
  gap: 7px 10px;
  align-items: center;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  background: rgba(6, 8, 22, 0.42);
}

.field label {
  grid-column: 1 / -1;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  font-weight: 800;
}

.field em {
  color: var(--gold);
  font-style: normal;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  accent-color: var(--gold);
  background: linear-gradient(to right, rgba(255, 255, 255, 0.1), var(--gold));
}

output {
  min-width: 112px;
  text-align: right;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

footer {
  margin-top: 12px;
  padding: 10px;
  line-height: 1.35;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

footer strong { color: var(--gold); }
body[data-theme="ultraQuetta"] footer strong { text-shadow: 0 0 6px rgba(0, 217, 255, 0.6); }

button:focus-visible,
input:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

body,
button,
label,
output,
.status,
footer,
h1,
h2 { text-shadow: 0 0 6px rgba(255, 255, 255, 0.08); }

@media (min-width: 370px) {
  .presetGrid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
