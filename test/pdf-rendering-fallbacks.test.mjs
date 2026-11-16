import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require=createRequire(new URL('../packages/renderers/pdf/package.json',import.meta.url));
const source=readFileSync(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'),'utf8');
const ast=ts.createSourceFile('pdf.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function method(className,name){
 const classes=ast.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===className);
 assert.equal(classes.length,1,'Pinned PDF.js class changed');
 const members=classes[0].members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)===name);
 assert.equal(members.length,1,'Pinned PDF.js method changed');return members[0].getText(ast);
}
// Execute the installed, formally patched implementation, never a copied predicate.
const Modes={FILL:0,STROKE:1,FILL_STROKE:2,INVISIBLE:3,FILL_STROKE_MASK:3,ADD_TO_PATH_FLAG:4};
const showText=new Function('TextRenderingMode',`return ({${method('CanvasGraphics','showText')}}).showText`)(Modes);
const glyph=(code,extra={})=>({fontChar:String.fromCharCode(code),unicode:String.fromCharCode(code),originalCharCode:code,width:500,isSpace:false,isInFont:false,accent:null,...extra});
function run(glyphs,{font={},current={},visible=true}={}){
 const calls=[],paths=[],type3=[];
 const ctx={save(){},restore(){},transform(){},translate(){},scale(){},fillText(...a){calls.push(a)},measureText(){return {width:10}}};
 const state={font:{missingFile:true,isType3Font:false,disableFontFace:false,vertical:false,fontMatrix:[.001,0,0,.001,0,0],defaultVMetrics:[-1000,500,800],remeasure:false,...font},fontMatrix:[.001,0,0,.001,0,0],fontSize:20,fontSizeScale:1,charSpacing:2,wordSpacing:3,fontDirection:1,textHScale:1,textRenderingMode:0,patternFill:false,patternStroke:false,lineWidth:1,textMatrixScale:1,x:10,y:100,textRise:0,...current};
 const self={current:state,ctx,dependencyTracker:null,contentVisible:visible,paintChar(...a){paths.push(a)},showType3Text(...a){type3.push(a)},compose(){}};
 showText.call(self,0,glyphs);return {calls,paths,type3,state};
}
test('unmapped fallback controls suppress paint but retain PDF advances and TJ spacing',()=>{
 const input=[glyph(65,{isInFont:true}),glyph(1),-120,glyph(2,{width:250}),glyph(66,{isInFont:true})];
 const r=run(input);assert.deepEqual(r.calls.map(x=>x[0]),['A','B']);
 assert.equal(r.calls[1][1],33.4);assert.equal(r.state.x,55.4);
 assert.equal(input[1].unicode,'\x01');assert.equal(input[3].width,250);
});
test('all C0, DEL and C1 unmapped fallback controls suppress both fill and stroke',()=>{
 const input=[...Array(32).keys(),...Array.from({length:33},(_,i)=>127+i)].map(c=>glyph(c));
 for(const textRenderingMode of [0,1,2,3]){const r=run(input,{current:{textRenderingMode}});assert.equal(r.calls.length,0);assert.equal(r.paths.length,0);assert.equal(r.state.x,790);}
});
test('explicit glyph mapping, Unicode mapping, embedded font and differing original codes are retained',()=>{
 const cases=[glyph(1,{isInFont:true}),glyph(1,{unicode:'A'}),glyph(1,{originalCharCode:65}),glyph(65,{originalCharCode:1,isInFont:true}),glyph(1,{fontChar:'AB',unicode:'AB'})];
 for(const g of cases)assert.equal(run([g]).calls.length,1);
 assert.equal(run([glyph(1,{isInFont:true})],{font:{missingFile:false}}).calls.length,1);
 assert.equal(run([glyph(1)],{font:{isType3Font:true}}).type3.length,1);
});
test('vertical advances and word/character spacing survive suppressed paint',()=>{
 const r=run([glyph(1,{vmetric:[-900,100,700]}),glyph(32,{width:300,isSpace:true,isInFont:true}),glyph(2)],{font:{vertical:true},current:{textHScale:.75}});
 assert.deepEqual(r.calls.map(x=>x[0]),[' ']);assert.equal(r.state.x,10);assert.equal(r.state.y,51);
});
test('ordinary glyphs, accents and path rendering remain visible',()=>{
 const r=run([glyph(65,{isInFont:true,accent:{fontChar:'´',offset:{x:.2,y:.3}}})],{current:{textRenderingMode:1}});
 assert.deepEqual(r.paths.map(x=>x[1]),['A','´']);
});
test('measurement canvas owns the upstream hidden CSS and normal intrinsic size and cleanup',()=>{
 const nodes=[];const document={body:{append(n){nodes.push(n)}},createElement(tag){assert.equal(tag,'canvas');const n={style:{},width:300,height:150,removed:false,getContext(kind,options){assert.equal(kind,'2d');assert.deepEqual(options,{alpha:false,willReadFrequently:true});return {canvas:n}},remove(){n.removed=true}};return n}};
 const Layer=new Function('document',`return class Layer {static #canvasContexts=new Map();static #canvasCtxFonts=new WeakMap();static #pendingTextLayers=new Set();static #ascentCache=new Map();${method('TextLayer','#getCtx')} ${method('TextLayer','cleanup')} static get(lang){return this.#getCtx(lang)}}`)(document);
 const a=Layer.get('en');assert.equal(Layer.get('en'),a);Layer.get('ja');assert.equal(nodes.length,2);
 for(const n of nodes){assert.equal(n.className,'hiddenCanvasElement');assert.equal(n.style.cssText,'position:absolute;top:0;left:0;width:0;height:0;display:none');assert.equal(n.width,300);assert.equal(n.height,150)}
 Layer.cleanup();assert.ok(nodes.every(n=>n.removed));assert.notEqual(Layer.get('en'),a);
});
