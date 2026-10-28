// How far do lives climb? Paths entered, ranks reached, exams sat, income spread.
const { load } = require('./harness');
const T = load(require('path').join(__dirname, '..', 'index.html'),
  'birth,tick,applyChoice,reveal,openDec,openCope,present,autoPick,STANCES,PATHS');
T.set('reveal', () => {});
T.set('openCope', (sit, cb) => { const o = T.autoPick(sit, 'any'); cb(o, !!T.S.insp && o.p < .5); });
T.set('openDec', (d, done) => { const S = T.S; if (d.id) S.done[d.id] = 1;
  if (d.kind !== 'reflect') { let c = d.ch[Math.floor(Math.random() * d.ch.length)]; if (d.id === 'call') c = d.ch[0]; T.applyChoice(d, c); }
  done(); });
T.set('present', o => o.buttons[0].fn());

const N = +process.argv[2] || 2000;
const by = {}, tierTop = {}, inc = [], exams = [];
let inPath = 0, commoners = 0;
for (let i = 0; i < N; i++) {
  T.birth(); const S = T.S; S.stance = T.STANCES[i % 4].id;
  let g = 0, peakMul = 1; while (!S.dead && g++ < 4000) { T.tick(); }
  const best = [{ path: S.path, rank: S.rank }, ...S.pastPaths].reduce((a, b) => (b.rank > a.rank ? b : a));
  if (S.path) inPath++;
  if (best.path) { const k = best.path; (by[k] = by[k] || []).push(best.rank); }
  if (!S.adv) { commoners++; exams.push(S.exams); }
  const t = S.tier.th; tierTop[t] = tierTop[t] || [0, 0, 0]; tierTop[t][0]++; if (best.rank >= 3) tierTop[t][1]++; if (best.rank >= 5) tierTop[t][2]++;
}
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '0') + '%';
console.log(`lives ${N} · entered a path ${pct(inPath, N)}`);
console.log('path        lives   r1+    r2+    r3+    r4+    r5');
T.PATHS.forEach(p => { const a = by[p.id] || []; const n = a.length;
  console.log(p.id.padEnd(10), String(n).padStart(5), [1, 2, 3, 4, 5].map(r => pct(a.filter(x => x >= r).length, n).padStart(6)).join(' ')); });
console.log('\nby birth   lives  rank3+  rank5');
Object.entries(tierTop).forEach(([t, [n, r3, r5]]) => console.log(t.padEnd(18), String(n).padStart(5), pct(r3, n).padStart(7), pct(r5, n).padStart(6)));
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
console.log(`\nexams per commoner life ${avg(exams).toFixed(2)}`);
