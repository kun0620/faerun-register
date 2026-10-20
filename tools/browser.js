// Real-browser test: every race's portrait and scene draws, screens render, no console errors.
const {chromium}=require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs');
const OUT=require('os').tmpdir();
(async()=>{
  let html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  html=html.replace('(function init(){','window.__T={get S(){return S},set S(v){S=v},RACES,REGIONS,TIERS,birth,tick,renderLife,renderDeath,finish,drawPortrait,drawScene,show,makeLook,set:(n,f)=>{eval(n+"=f")}};\n(function init(){');
  fs.writeFileSync(OUT+'/t.html',html);
  const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
  const errors=[];
  for(const [w,h,tag,scheme] of [[1280,900,'desk','light'],[390,844,'phone','dark']]){
    const p=await b.newPage({viewport:{width:w,height:h},colorScheme:scheme});
    p.on('pageerror',e=>errors.push(tag+': '+e.message));
    p.on('console',m=>{if(m.type()==='error'&&!/fonts/.test(m.text()))errors.push(tag+' console: '+m.text());});
    await p.goto('file://'+OUT+'/t.html');
    const res=await p.evaluate(()=>{
      const T=window.__T,out=[];
      T.set('reveal',d=>d());
      T.set('openDec',d=>{T.S.done[d.id]=1;});
      for(const race of T.RACES){
        T.birth();const S=T.S;S.race=race;S.look=T.makeLook(race,S.tier);
        for(const age of [0,race.mature,Math.round(race.span*.9)]){
          S.age=age;
          const cv=document.createElement('canvas');cv.width=184;cv.height=184;T.drawPortrait(cv,S);
          const sc=document.createElement('canvas');sc.width=700;sc.height=230;T.drawScene(sc);
          const ink=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const seen=new Set();for(let i=0;i<d.length;i+=4*97)seen.add(d[i]+','+d[i+1]+','+d[i+2]);return seen.size;};
          out.push({race:race.id,age,portraitColours:ink(cv),sceneColours:ink(sc)});
        }
      }
      return out;
    });
    const bad=res.filter(r=>r.portraitColours<4||r.sceneColours<5);
    console.log(tag,'portrait/scene checks',res.length,'failed',bad.length,bad.length?JSON.stringify(bad):'');
    // live a while, screenshot the life screen
    await p.evaluate(()=>{const T=window.__T;T.set('present',o=>o.buttons[0].fn());T.birth();T.show('s-life');for(let i=0;i<40&&!T.S.dead;i++)T.tick();T.renderLife();});
    await p.waitForTimeout(300);
    await p.screenshot({path:`${OUT}/life-${tag}.png`,fullPage:true});
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    console.log(tag,'horizontal overflow on life screen:',overflow);
    await p.evaluate(()=>{const T=window.__T;while(!T.S.dead)T.tick();});
    await p.waitForTimeout(300);
    await p.screenshot({path:`${OUT}/death-${tag}.png`,fullPage:true});
    console.log(tag,'horizontal overflow on death screen:',await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth));
    // a modal: dying presentation
    await p.evaluate(()=>{const T=window.__T;T.set('present',window.__realPresent||(()=>{}));});
  }
  console.log('errors',errors.length?errors:'none');
  await b.close();
})();
