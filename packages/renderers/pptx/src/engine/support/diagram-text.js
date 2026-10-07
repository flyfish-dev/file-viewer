/** Recover separate SmartArt text regions from the document's layout constraints.
 * This is intentionally a bounded subset, not a replacement diagram layout engine.
 * Complete cached text transforms win. Missing/ambiguous equations retain the
 * cached drawing instead of guessing a position from names or visible text.
 */
const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const finite = v => v != null && String(v).trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
const rectangle = x => {
  const o = x?.['a:off']?.attrs, e = x?.['a:ext']?.attrs;
  const r = {x:finite(o?.x), y:finite(o?.y), w:finite(e?.cx), h:finite(e?.cy)};
  return Object.values(r).every(v => v !== undefined && Math.abs(v) < 2147483648) && r.w > 0 && r.h > 0 ? r : undefined;
};
const sameBox = (a,b) => a && b && ['x','y','w','h'].every(k => Math.abs(a[k]-b[k]) < 1);
const simpleTransform = x => !['rot','flipH','flipV'].some(k => x?.attrs?.[k] && !['0','false'].includes(String(x.attrs[k])));
const keyName = node => node?.attrs?.name;

export function resolveDiagramTextFrames(shapes, data, definition) {
  const result = new Map();
  const model = data?.['dgm:dataModel'], layout = definition?.['dgm:layoutDef']?.['dgm:layoutNode'];
  if (!model || !layout || layout['dgm:alg']?.attrs?.type !== 'composite') return result;
  const points = list(model['dgm:ptLst']?.['dgm:pt']);
  const connections = list(model['dgm:cxnLst']?.['dgm:cxn']);
  if (points.length > 10000 || connections.length > 20000 || shapes.length > 10000) return result;
  const docs = points.filter(p => p.attrs?.type === 'doc');
  if (docs.length !== 1) return result;
  const byId = new Map(points.map(p => [p.attrs?.modelId,p]));
  const children = new Set(connections.filter(c => {
    const a=c.attrs, target=byId.get(a?.destId)?.attrs;
    return a?.srcId===docs[0].attrs.modelId && (!a.type || a.type==='parOf') && target && (!target.type || target.type==='node');
  }).map(c=>c.attrs.destId));
  if (!children.size) return result;
  const count = children.size;
  const constraints = new Map(), textNodes = [], layoutNames = new Map();
  let visited=0, unsafe=false;
  const condition = node => {
    const a=node.attrs||{};
    if(a.func!=='cnt'||a.axis!=='ch'||(a.ptType && a.ptType!=='node')) return undefined;
    const value=finite(a.val);if(value===undefined)return undefined;
    switch(a.op){case 'equ':return count===value;case 'neq':return count!==value;
      case 'gt':return count>value;case 'gte':return count>=value;
      case 'lt':return count<value;case 'lte':return count<=value;default:return undefined;}
  };
  const walk = (node,depth=0,rootScope=true) => {
    if (!node || typeof node !== 'object') return;
    if (++visited>10000 || depth>48) {unsafe=true;return;}
    if(rootScope)for(const c of list(node['dgm:constrLst']?.['dgm:constr'])){
      const a=c.attrs||{};
      if(a.for!=='ch'||!a.forName||!['l','t','r','b','w','h'].includes(a.type))continue;
      const set=constraints.get(a.forName)||new Map();
      // Multiple incompatible assignments and indirect references are not a
      // solved layout. Explicitly invalidate rather than applying the last one.
      if(set.has(a.type))set.set(a.type,null);else set.set(a.type,a);
      constraints.set(a.forName,set);
    }
    for(const choice of list(node['dgm:choose'])){
      let selected, unknown=false;
      for(const branch of list(choice['dgm:if'])){
        const yes=condition(branch);if(yes===undefined){unknown=true;break;}if(yes){selected=branch;break;}
      }
      if(!unknown)walk(selected||choice['dgm:else'],depth+1,rootScope);
    }
    for(const child of list(node['dgm:layoutNode'])){
      const name=keyName(child);if(name){if(layoutNames.has(name))layoutNames.set(name,null);else layoutNames.set(name,child);}
      const alg=child['dgm:alg']?.attrs?.type, sh=child['dgm:shape']?.attrs;
      if(name && child.attrs?.moveWith && alg==='tx' && ['1','true'].includes(String(sh?.hideGeom)) && sh?.type==='rect')textNodes.push(child);
      walk(child,depth+1,false);
    }
  };
  walk(layout);if(unsafe)return result;
  const value = (a,w,h) => {
    if(!a||(a.op && a.op!=='equ')||(a.refFor && a.refFor!=='self')||a.refForName||a.refPtType)return undefined;
    if(!['w','h'].includes(a.refType))return undefined;
    const factor=finite(a.fact);if(factor===undefined||Math.abs(factor)>16)return undefined;
    return factor*(a.refType==='w'?w:h);
  };
  const box = (set,w,h) => {
    if(!set)return undefined;
    const values=Object.fromEntries([...set].map(([k,a])=>[k,value(a,w,h)]));
    const width=values.w, height=values.h;
    if(!(width>0&&height>0))return undefined;
    const x=values.l ?? (values.r===undefined?undefined:values.r-width);
    const y=values.t ?? (values.b===undefined?undefined:values.b-height);
    return x!==undefined && y!==undefined ? {x,y,w:width,h:height} : undefined;
  };
  const sources = new Map();
  for(const c of connections){const a=c.attrs;if(a?.type==='presOf'){
    const ids=sources.get(a.destId)||new Set();ids.add(a.srcId);sources.set(a.destId,ids);
  }}
  for(const shape of shapes){
    const id=shape.attrs?.modelId, point=byId.get(id), name=point?.['dgm:prSet']?.attrs?.presName;
    const visual=shape['p:spPr']?.['a:xfrm'], cached=shape['p:txXfrm'];
    const actual=rectangle(visual), text=rectangle(cached);
    if(!name||!actual||!simpleTransform(visual)||!simpleTransform(cached)||(text&&!sameBox(actual,text)))continue;
    const linked=textNodes.filter(n=>n.attrs.moveWith===name && layoutNames.get(keyName(n))===n);
    if(linked.length!==1)continue;
    const targetName=keyName(linked[0]);
    const targetPoints=points.filter(p=>p['dgm:prSet']?.attrs?.presName===targetName);
    if(targetPoints.length!==1)continue;
    const src=sources.get(id), targetSrc=sources.get(targetPoints[0].attrs?.modelId);
    if(!src||!targetSrc||![...src].some(s=>targetSrc.has(s)))continue;
    const shapeConstraints=constraints.get(name), textConstraints=constraints.get(targetName);
    const w=shapeConstraints?.get('w'), h=shapeConstraints?.get('h');
    // Infer the parent coordinate system from the cached authored shape. This
    // also carries moveWith drag offsets and independently scaled dimensions.
    if(w?.refType!=='w'||h?.refType!=='h')continue;
    const fw=value(w,1,1),fh=value(h,1,1);if(!(fw>0&&fh>0))continue;
    const parentW=actual.w/fw,parentH=actual.h/fh;
    if(!Number.isFinite(parentW+parentH)||parentW>2147483647||parentH>2147483647)continue;
    const original=box(shapeConstraints,parentW,parentH), desired=box(textConstraints,parentW,parentH);
    if(!original||!desired)continue;
    const resolved={x:actual.x+desired.x-original.x,y:actual.y+desired.y-original.y,w:desired.w,h:desired.h};
    if(!Object.values(resolved).every(v=>Number.isFinite(v)&&Math.abs(v)<2147483648))continue;
    result.set(id,{'a:off':{attrs:{x:String(resolved.x),y:String(resolved.y)}},'a:ext':{attrs:{cx:String(resolved.w),cy:String(resolved.h)}}});
  }
  return result;
}

/** Merge partially authored text transforms without changing painted geometry. */
export function effectiveTextTransform(text, shape) {
  if (!text) return shape;
  const value={...shape,...text,'a:off':text['a:off']||shape?.['a:off'],'a:ext':text['a:ext']||shape?.['a:ext']};
  return rectangle(value) ? value : shape;
}
