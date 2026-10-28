// How much does the player actually get to decide in one life? Measured against the
// "เป้าหมาย" table in docs/plan-gameplay.md.
//   node tools/agency.js [humanLives=1500] [elfLives=200] [paceMinutes=12]
// A decision is a window the player answered or a coping choice the standing stance made
// (the plan counts both). A roll "had a decision before it" when it was rolled while
// resolving one of those choices. NPC rolls (an attacker's, a helper's) are not the player's.
const path = require('path');
const { load } = require('./harness');
const T = load(path.join(__dirname, '..', 'index.html'),
  'birth,tick,applyChoice,reveal,openDec,openCope,present,perish,autoPick,STANCES,DECS,BANK,PLANTS,msPerYear');
const [NH, NE, PACE] = [+process.argv[2] || 1500, +process.argv[3] || 200, +process.argv[4] || 12];
T.opt.pace = PACE;
T.set('reveal', () => {});
// a player who reads every window: random answer to a question, best odds in a big matter
T.set('openDec', (d, done) => { if (d.id) T.S.done[d.id] = 1; (T.S.shown = T.S.shown || []).push(d.id);
  if (d.kind !== 'reflect') T.applyChoice(d, d.ch[Math.floor(Math.random() * d.ch.length)]); done(); });
T.set('openCope', (sit, cb) => { const o = T.autoPick(sit, 'any'); cb(o, !!T.S.insp && o.p < .5); });
T.set('present', o => { o.buttons[o.buttons.length - 1].fn(); });

const CORE = new Set(T.DECS.map(d => d.id));   // the core is whatever sits in DECS, not a copied list
const QIDS = new Set([...T.DECS.map(d => d.id), ...T.BANK.map(d => d.id)]);
const BIDS = new Set(T.BANK.map(d => d.id));

function live(race, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    T.birth();
    const S = T.S;
    if (S.race.id !== race) { i--; continue; }
    S.stance = T.STANCES[i % 4].id;
    let g = 0;
    while (!S.dead && g++ < 5000) T.tick();
    const hy = 72 / S.span, mins = S.age * T.msPerYear() / 60000;
    const ages = [0, ...S.decAges, S.age];
    let gap = 0; for (let k = 1; k < ages.length; k++) gap = Math.max(gap, (ages[k] - ages[k - 1]) * hy);
    rows.push({ age: S.age, hyAge: S.age * hy, dec: S.nDec, stance: S.nStance, modal: S.nDec - S.nStance, ask: S.nAsk, mins, gap,
      own: S.nOwn, decRolls: S.nDecRolls, all: S.nRolls, ids: [...new Set(S.shown || [])].filter(k => QIDS.has(k)),
      bank: new Set((S.shown || []).filter(k => BIDS.has(k))).size, adv: S.adv, insp: S.inspGot || 0, kept: S.idealKept || 0, broke: S.idealBroke || 0 });
  }
  return rows;
}
const avg = (r, f) => r.reduce((a, x) => a + f(x), 0) / r.length;
const med = (r, f) => { const v = r.map(f).sort((a, b) => a - b); return v[v.length >> 1]; };
const pct = x => (x * 100).toFixed(0) + '%';
const ok = b => b ? '✓' : '✗';

const H = live('human', NH);
const E = NE ? live('elf', NE) : [];
const perMin = r => avg(r, x => x.dec) / avg(r, x => x.mins);
const winMin = r => avg(r, x => x.ask) / avg(r, x => x.mins);
const decShare = avg(H, x => x.decRolls) / avg(H, x => x.own);
const freq = {};
H.forEach(r => r.ids.forEach(id => { freq[id] = (freq[id] || 0) + 1; }));
const hot = Object.entries(freq).filter(([k, v]) => !CORE.has(k) && v / H.length > .6);
const dH = avg(H, x => x.dec), gapH = med(H, x => x.gap), wH = winMin(H);

console.log(`มนุษย์ ${H.length} ชีวิต · อายุกลาง ${med(H, x => x.age)} ปี · ความยาวชีวิต ${PACE} นาที${E.length ? ` · เอลฟ์ ${E.length} ชีวิต` : ''}\n`);
console.log('ตัวชี้วัด                                         วัดได้          เป้า');
// careers (docs/plan-careers.md) add the crossroads, childhood focus, chances, exams and quests on purpose; the bound that matters is windows per minute
console.log(`การตัดสินใจต่อชีวิต (หน้าต่าง + ทางรับมือ)        ${dH.toFixed(1).padEnd(6)} กลาง ${med(H, x => x.dec)}   30–45  ${ok(dH >= 30 && dH <= 45)}`);
console.log(`   · กดเลือกเองในหน้าต่าง ${avg(H, x => x.modal).toFixed(1)} (คำถามจากคลัง ${avg(H, x => x.bank).toFixed(1)}) · ท่าทีเลือกให้ ${avg(H, x => x.stance).toFixed(1)}`);
{ const A = H.filter(x => x.adv), C = H.filter(x => !x.adv);
  console.log(`   · คนธรรมดา ${avg(C, x => x.dec).toFixed(1)} · นักผจญภัย ${A.length ? avg(A, x => x.dec).toFixed(1) : '—'} (มีการเผชิญหน้าให้เลือกทาง)`);
  if (A.length) console.log(`   · ถ้านักผจญภัยมี 20% เท่าที่วัดใน sim.js: ${(.8 * avg(C, x => x.dec) + .2 * avg(A, x => x.dec)).toFixed(1)}`); }
console.log(`ช่วงยาวที่สุดที่ไม่มีอะไรให้เลือก (ปีมนุษย์)      กลาง ${gapH.toFixed(1).padEnd(6)}     ≤ 8    ${ok(gapH <= 8)}`);
console.log(`การทอยของตัวละครที่มีการตัดสินใจมาก่อน          ${pct(decShare).padEnd(14)} ≥ 40%  ${ok(decShare >= .4)}`);
console.log(`   · ทอยของตัวละคร ${avg(H, x => x.own).toFixed(0)} ครั้งต่อชีวิต (ทั้งหมดรวม NPC ${avg(H, x => x.all).toFixed(0)}) · มีการตัดสินใจมาก่อน ${avg(H, x => x.decRolls).toFixed(0)}`);
console.log(`คำถามที่ไม่ใช่แกนกลางแต่เจอเกิน 60% ของชีวิต     ${String(hot.length).padEnd(14)} 0      ${ok(!hot.length)}${hot.length ? ' ' + hot.map(([k, v]) => k + ' ' + pct(v / H.length)).join(' ') : ''}`);
if (E.length) {
  const pe = perMin(E), ph = perMin(H), diff = Math.abs(pe - ph) / ph;
  console.log(`การตัดสินใจต่อนาทีจริง มนุษย์ / เอลฟ์           ${ph.toFixed(2)} / ${pe.toFixed(2)} (ต่าง ${pct(diff)})  ≤ 25%  ${ok(diff <= .25)}`);
  console.log(`   · เอลฟ์: ${avg(E, x => x.dec).toFixed(1)} การตัดสินใจต่อชีวิต · ช่วงว่างกลาง ${med(E, x => x.gap).toFixed(1)} ปีมนุษย์ · หน้าต่าง ${winMin(E).toFixed(2)} ต่อนาที · ทอยที่มีการตัดสินใจ ${pct(avg(E, x => x.decRolls) / avg(E, x => x.own))}`);
}
console.log(`หน้าต่างที่เด้งต่อนาทีจริง                        ${wH.toFixed(2).padEnd(14)} ≤ 2    ${ok(wH <= 2)}`);
console.log(`   · ${avg(H, x => x.ask).toFixed(1)} หน้าต่างต่อชีวิต ใน ${avg(H, x => x.mins).toFixed(1)} นาทีจริงโดยเฉลี่ย · ชีวิตที่เกิน 2 ต่อนาที ${pct(H.filter(x => x.ask / x.mins > 2).length / H.length)}`);
console.log(`\nแรงบันดาลใจที่ได้ต่อชีวิต ${avg(H, x => x.insp).toFixed(1)} · อยู่ตามอุดมการณ์ ${avg(H, x => x.kept).toFixed(1)} ครั้ง ทิ้ง ${avg(H, x => x.broke).toFixed(1)} ครั้ง`);
console.log(`นักผจญภัย ${pct(H.filter(x => x.adv).length / H.length)} (ผู้เล่นสุ่มคำตอบ จึงตอบรับเสียงเรียกราวครึ่งเดียว — อัตราจริงวัดใน tools/sim.js)`);
console.log(`จุดตัดสินใจในคลัง: แกนกลาง ${T.DECS.length} · คลังคำถาม ${T.BANK.length} · ที่ปลูกจากแผงใช้เงิน ${Object.keys(T.PLANTS).length} · รวม ${T.DECS.length + T.BANK.length + Object.keys(T.PLANTS).length}`);
console.log('\nจุดตัดสินใจที่เจอบ่อยที่สุด (% ของชีวิตมนุษย์, * = แกนกลาง):');
Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 24)
  .forEach(([k, v]) => console.log(`  ${(CORE.has(k) ? '*' : ' ') + k.padEnd(18)} ${pct(v / H.length)}`));
