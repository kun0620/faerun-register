// How much does the player actually get to decide in one life?
// Counts decisions offered, visible rolls, and the longest stretch with nothing to do.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { load } = require('./harness');
const T = load(path.join(ROOT, 'index.html'), 'birth,tick,applyChoice,finish,reveal,openDec,openCope,present,perish,autoPick');
T.set('openCope',(sit,cb)=>cb(T.autoPick(sit,'any'),false));
T.set('reveal', () => {});
let decs = [];
T.set('openDec', d => {
  const S = T.S;
  if (d.id) S.done[d.id] = 1;
  decs.push({ age: S.age, id: d.id || '?', kind: d.kind || 'choice', stage: S.age < S.race.mature ? 'child' : 'adult' });
  if (d.kind === 'reflect') return;
  T.applyChoice(d, d.ch[Math.floor(Math.random() * d.ch.length)]);
});
T.set('present', o => { o.buttons[o.buttons.length - 1].fn(); });

const N = 1500, rows = [];
for (let i = 0; i < N; i++) {
  decs = [];
  T.birth();
  const S = T.S;
  if (S.race.id !== 'human') { i--; continue; }
  let g = 0;
  while (!S.dead && g++ < 3000) T.tick();
  const choice = decs.filter(d => d.kind !== 'reflect');
  const ages = [0, ...choice.map(d => d.age), S.age].sort((a, b) => a - b);
  let gap = 0; for (let k = 1; k < ages.length; k++) gap = Math.max(gap, ages[k] - ages[k - 1]);
  rows.push({ years: S.age, choices: choice.length, child: choice.filter(d => d.stage === 'child').length,
    rolls: S.nRolls || 0, gap, adv: !!S.adv, ids: choice.map(d => d.id) });
}
const avg = f => rows.reduce((a, r) => a + f(r), 0) / rows.length;
const med = f => { const v = rows.map(f).sort((a, b) => a - b); return v[v.length >> 1]; };
const mins = 12; // default life length setting
console.log(`มนุษย์ ${rows.length} ชีวิต · อายุเฉลี่ย ${avg(r => r.years).toFixed(0)} ปี`);
console.log(`การตัดสินใจที่ผู้เล่นได้เลือกต่อชีวิต: เฉลี่ย ${avg(r => r.choices).toFixed(1)} (กลาง ${med(r => r.choices)}) · ในวัยเด็ก ${avg(r => r.child).toFixed(1)}`);
console.log(`ที่ความยาวชีวิต ${mins} นาที = ได้ตัดสินใจทุก ${(mins * 60 / avg(r => r.choices)).toFixed(0)} วินาทีโดยเฉลี่ย`);
console.log(`ช่วงยาวที่สุดที่ไม่มีอะไรให้เลือกเลย: กลาง ${med(r => r.gap)} ปี (≈ ${(med(r => r.gap) / 72 * mins).toFixed(1)} นาทีจริง)`);
console.log(`การทอยลูกเต๋าต่อชีวิต: เฉลี่ย ${avg(r => r.rolls).toFixed(0)} ครั้ง · ผู้เล่นไม่ได้เลือกอะไรในการทอยเหล่านี้`);
const freq = {};
rows.forEach(r => new Set(r.ids).forEach(id => { freq[id] = (freq[id] || 0) + 1; }));
console.log('\nจุดตัดสินใจที่เจอบ่อยที่สุด (% ของชีวิต):');
Object.entries(freq).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${(v / rows.length * 100).toFixed(0)}%`));
