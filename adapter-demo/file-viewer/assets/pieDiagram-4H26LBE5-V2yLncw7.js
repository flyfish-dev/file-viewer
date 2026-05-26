import{n as e,r as t}from"./chunk-AGHRB4JF-BJwbBkzn.js";import{H as n,K as r,U as i,a,c as o,f as s,v as c,w as l,x as u,y as d}from"./chunk-CSCIHK7Q-aUHEuAJU.js";import{t as f}from"./ordinal-CEZ33b-s.js";import"./src-BBw8FbvP.js";import{t as p}from"./arc-Dimj_7G-.js";import{t as m}from"./pie-DUmD7IHG.js";import{i as h,p as g}from"./chunk-5ZQYHXKU-DndElAUK.js";import{t as _}from"./chunk-WU5MYG2G-DB3V6ZLl.js";import{t as v}from"./mermaid-parser.core-CGXz-aOL.js";import{t as y}from"./chunk-4BX2VUAB-hvT3TGR9.js";var b=s.pie,x={sections:new Map,showData:!1,config:b},S=x.sections,C=x.showData,w=structuredClone(b),T={getConfig:e(()=>structuredClone(w),`getConfig`),clear:e(()=>{S=new Map,C=x.showData,a()},`clear`),setDiagramTitle:r,getDiagramTitle:l,setAccTitle:i,getAccTitle:d,setAccDescription:n,getAccDescription:c,addSection:e(({label:e,value:n})=>{if(n<0)throw Error(`"${e}" has invalid value: ${n}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);S.has(e)||(S.set(e,n),t.debug(`added new section: ${e}, with value: ${n}`))},`addSection`),getSections:e(()=>S,`getSections`),setShowData:e(e=>{C=e},`setShowData`),getShowData:e(()=>C,`getShowData`)},E=e((e,t)=>{y(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},`populateDb`),D={parse:e(async e=>{let n=await v(`pie`,e);t.debug(n),E(n,T)},`parse`)},O=e(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,`getStyles`),k=e(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),n=[...e.entries()].map(([e,t])=>({label:e,value:t})).filter(e=>e.value/t*100>=1);return m().value(e=>e.value).sort(null)(n)},`createPieArcs`),A={parser:D,db:T,renderer:{draw:e((e,n,r,i)=>{t.debug(`rendering pie chart
`+e);let a=i.db,s=u(),c=h(a.getConfig(),s.pie),l=_(n),d=l.append(`g`);d.attr(`transform`,`translate(225,225)`);let{themeVariables:m}=s,[v]=g(m.pieOuterStrokeWidth);v??=2;let y=c.textPosition,b=p().innerRadius(0).outerRadius(185),x=p().innerRadius(185*y).outerRadius(185*y);d.append(`circle`).attr(`cx`,0).attr(`cy`,0).attr(`r`,185+v/2).attr(`class`,`pieOuterCircle`);let S=a.getSections(),C=k(S),w=[m.pie1,m.pie2,m.pie3,m.pie4,m.pie5,m.pie6,m.pie7,m.pie8,m.pie9,m.pie10,m.pie11,m.pie12],T=0;S.forEach(e=>{T+=e});let E=C.filter(e=>(e.data.value/T*100).toFixed(0)!==`0`),D=f(w).domain([...S.keys()]);d.selectAll(`mySlices`).data(E).enter().append(`path`).attr(`d`,b).attr(`fill`,e=>D(e.data.label)).attr(`class`,`pieCircle`),d.selectAll(`mySlices`).data(E).enter().append(`text`).text(e=>(e.data.value/T*100).toFixed(0)+`%`).attr(`transform`,e=>`translate(`+x.centroid(e)+`)`).style(`text-anchor`,`middle`).attr(`class`,`slice`);let O=d.append(`text`).text(a.getDiagramTitle()).attr(`x`,0).attr(`y`,-400/2).attr(`class`,`pieTitleText`),A=[...S.entries()].map(([e,t])=>({label:e,value:t})),j=d.selectAll(`.legend`).data(A).enter().append(`g`).attr(`class`,`legend`).attr(`transform`,(e,t)=>{let n=22*A.length/2;return`translate(216,`+(t*22-n)+`)`});j.append(`rect`).attr(`width`,18).attr(`height`,18).style(`fill`,e=>D(e.label)).style(`stroke`,e=>D(e.label)),j.append(`text`).attr(`x`,22).attr(`y`,14).text(e=>a.getShowData()?`${e.label} [${e.value}]`:e.label);let M=512+Math.max(...j.selectAll(`text`).nodes().map(e=>e?.getBoundingClientRect().width??0)),N=O.node()?.getBoundingClientRect().width??0,P=450/2-N/2,F=450/2+N/2,I=Math.min(0,P),L=Math.max(M,F)-I;l.attr(`viewBox`,`${I} 0 ${L} 450`),o(l,450,L,c.useMaxWidth)},`draw`)},styles:O};export{A as diagram};