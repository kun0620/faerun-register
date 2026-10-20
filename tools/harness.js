// Headless loader: runs the game's script in node with a stub DOM and exposes internals.
const fs=require('fs');
function stubEl(){
  const kids=[];
  const el=new Proxy({},{get(t,k){
    if(k in t)return t[k];
    if(k==='style'||k==='dataset')return t[k]={};
    if(k==='classList')return t[k]={add(){},remove(){},toggle(){},contains(){return false}};
    if(k==='children'||k==='childNodes')return kids;
    if(k==='getContext')return undefined;
    if(k==='querySelector')return ()=>stubEl();
    if(k==='querySelectorAll')return ()=>[];
    if(typeof k==='symbol')return undefined;
    return function(){return el;};
  },set(t,k,v){t[k]=v;return true;}});
  return el;
}
function load(file,inject){
  const html=fs.readFileSync(file,'utf8');
  const src=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
  const cache={};
  const document={querySelector:s=>cache[s]||(cache[s]=stubEl()),querySelectorAll:()=>[],createElement:()=>stubEl(),
    documentElement:stubEl(),addEventListener(){}};
  const g={document,window:{},localStorage:{getItem:()=>null,setItem(){}},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},
    getComputedStyle:()=>({getPropertyValue:()=>'#fff'}),matchMedia:()=>({matches:true}),scrollTo(){},console,Math,JSON,Object,Array,String,Number,isFinite,Infinity};
  g.window=g;
  const hook=`globalThis.__T={get S(){return S},set S(v){S=v},opt,${inject},set:(n,f)=>{eval(n+'=f')}};\n`;
  const code=src.replace('(function init(){',hook+'(function init(){');
  const fn=new Function(...Object.keys(g),'globalThis',code);
  const G={};
  fn(...Object.values(g),G);
  return G.__T;
}
module.exports={load};
