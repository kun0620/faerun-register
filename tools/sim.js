// Full balance run against the target table in docs/plan-dnd-rework.md
const {load}=require('./harness');
const T=load(require('path').join(__dirname,'..','index.html'),'birth,tick,applyChoice,finish,reveal,openDec,openCope,present,raiseOk,perish,autoPick,STANCES');
T.set('reveal',()=>{});
// a big matter is answered the way a player who reads the odds would: best chance on the table
T.set('openCope',(sit,cb)=>{const o=T.autoPick(sit,'any');cb(o,!!T.S.insp&&o.p<.5);});
T.set('openDec',(d,done)=>{const S=T.S;if(d.id)S.done[d.id]=1;if(d.kind!=='reflect'){
  let c=d.ch[Math.floor(Math.random()*d.ch.length)];if(d.id==='cross')c=d.ch.find(x=>x.adv)||d.ch.find(x=>x.row&&x.row.state==='open')||c;T.applyChoice(d,c);}done();});
let deathRec=null;
const realPerish=T.perish;
let firstPerish=true;
T.set('perish',cause=>{const S=T.S;
  if(firstPerish&&!S.adv){firstPerish=false;const e=!S.raised&&cause!=='ชราภาพ'&&S.age<S.span*.8;if(e){elig++;if(S.gold>=500&&(S.life.ward==='full'||S.donated||S.region.temple>=1))paid++;}}
  deathRec={cause,gold:S.gold,elig:!S.raised&&cause!=='ชราภาพ'&&S.age<S.span*.8,
    access:S.life.ward==='full'||S.donated||S.region.temple>=1||S.adv,adv:S.adv};
  realPerish(cause);});
T.set('present',o=>{o.buttons[0].fn();});   // takes the raise when it is offered
const N=+process.argv[2]||2000;
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1];};
const byRace={},hum=[],advAges=[],lv=[];let adv=0,ds=0,dsDeaths=0,faithless=0,falseN=0,weak=0,faithful=0,
  elig=0,paid=0,years=0,yearsNoRoll=0,raised=0,downs=0,oldAge=0,lives=0,dsLives=0,maxDs=0,ages=[];
const causes={};
for(let i=0;i<N;i++){
  firstPerish=true;T.birth();const S=T.S;lives++;S.stance=T.STANCES[i%4].id;
  while(!S.dead){T.tick();if(!S.dead||S.age>0){years++;if(S.yearRolls<1)yearsNoRoll++;}}
  (byRace[S.race.id]=byRace[S.race.id]||[]).push(S.age/S.race.span*72);
  if(S.race.id==='human')hum.push(S.age);
  ages.push(S.age);
  if(S.adv){adv++;advAges.push(S.age/S.race.span*72);lv.push(S.lvl);}
  ds+=S.dsEp;dsDeaths+=S.dsDied||0;if(S.dsEp)dsLives++;maxDs=Math.max(maxDs,S.dsEp);downs+=S.downs;
  const k=S.verdict&&S.verdict.kind;
  if(k==='faithless')faithless++;else if(k==='false')falseN++;else if(k==='weak')weak++;else faithful++;
  if(S.raised)raised++;
  causes[S.cause]=(causes[S.cause]||0)+1;
  if(S.cause==='ชราภาพ')oldAge++;
}
// deaths that came out of death saves = lives that ended by dying() with saves; approximate via episodes - survivors
// recount precisely: every life ends once; non-ds deaths are old age / exhaustion / quit
const pct=(a,b)=>(a/b*100).toFixed(1)+'%';
console.log('lives',N);
console.log('human median age            ',med(hum),'(target 62–68)  p25/p75',(()=>{const a=hum.slice().sort((x,y)=>x-y);return a[a.length>>2]+'/'+a[a.length*3>>2];})());
console.log('death-save episodes / life   ',(ds/N).toFixed(2),'(target 1–2) · lives with any',pct(dsLives,N),'· max in one life',maxDs);
console.log('die | rolled death saves       ',pct(dsDeaths,ds),'(target 60–70%)');
console.log('commoner raise affordable    ',pct(paid,elig),'(target 8–12%, v6 measured 9.3%)');
console.log('downed (hp 0) / life         ',(downs/N).toFixed(2));
console.log('verdicts faithless/false/weak/faithful',pct(faithless,N),pct(falseN,N),pct(weak,N),pct(faithful,N),'(faithless target 25–35%)');
console.log('adventurers                  ',pct(adv,N),'(target ~20%) · median human-eq age',med(advAges)|0,'· median level',med(lv));
console.log('raised                       ',pct(raised,N));
console.log('old age deaths               ',pct(oldAge,N));
console.log('years with ≥1 visible roll   ',pct(years-yearsNoRoll,years));
console.log('median human-equivalent age by race',Object.entries(byRace).map(([k,v])=>k+' '+(med(v)|0)+' (n'+v.length+')').join(' · '));
console.log('top causes',Object.entries(causes).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+' '+pct(v,N)).join(' · '));
module.exports={};
