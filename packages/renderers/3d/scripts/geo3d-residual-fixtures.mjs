// Deterministic synthetic inputs, generated in test output; original fixtures are untouched.
export function elevationTiff() {
  const width=128,height=128,nodata=-9999;
  const tags=[[256,4,[width]],[257,4,[height]],[258,3,[32]],[259,3,[1]],[262,3,[1]],[273,4,[0]],[277,3,[1]],[278,4,[height]],[279,4,[width*height*4]],[284,3,[1]],[339,3,[3]],[33550,12,[1,1,0]],[33922,12,[0,0,0,500000,5100128,0]],[34735,3,[1,1,0,3,1024,0,1,1,1025,0,1,1,3072,0,1,32632]],[42113,2,[45,57,57,57,57,0]]];
  let cursor=8+2+tags.length*12+4;
  const fields=tags.map(([tag,type,values])=>{const size=type===12?8:type===4?4:type===3?2:1;let offset;if(size*values.length>4){offset=cursor;cursor+=size*values.length}return {tag,type,values,size,offset}});
  cursor=Math.ceil(cursor/4)*4;fields.find(f=>f.tag===273).values[0]=cursor;
  const bytes=Buffer.alloc(cursor+width*height*4);bytes.write('II');bytes.writeUInt16LE(42,2);bytes.writeUInt32LE(8,4);bytes.writeUInt16LE(tags.length,8);
  for(const [i,f]of fields.entries()){const p=10+i*12;bytes.writeUInt16LE(f.tag,p);bytes.writeUInt16LE(f.type,p+2);bytes.writeUInt32LE(f.values.length,p+4);if(f.offset!==undefined)bytes.writeUInt32LE(f.offset,p+8);f.values.forEach((v,k)=>{const at=(f.offset??p+8)+k*f.size;if(f.type===12)bytes.writeDoubleLE(v,at);else if(f.type===4)bytes.writeUInt32LE(v,at);else if(f.type===3)bytes.writeUInt16LE(v,at);else bytes[at]=v})}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)bytes.writeFloatLE(x<32&&y<32?nodata:100,cursor+(y*width+x)*4);
  return bytes;
}
export function classifiedPnts() {
  const count=1024,positions=Buffer.alloc(count*12),classes=Buffer.alloc(count);
  for(let i=0;i<count;i++){const x=i%32,y=Math.floor(i/32);positions.writeFloatLE(x,12*i);positions.writeFloatLE(y,12*i+4);positions.writeFloatLE(0,12*i+8);classes[i]=x<16?2:5}
  const json=(value,prefix=0)=>{const text=Buffer.from(JSON.stringify(value));const b=Buffer.alloc(Math.ceil((prefix+text.length)/8)*8-prefix,32);text.copy(b);return b};
  const binary=Buffer.concat([positions,Buffer.alloc(count*3,255)]);
  const feature=json({POINTS_LENGTH:count,POSITION:{byteOffset:0},RGB:{byteOffset:positions.length}},28),batch=json({classification:{byteOffset:0,componentType:'UNSIGNED_BYTE',type:'SCALAR'}});
  const header=Buffer.alloc(28);header.write('pnts');header.writeUInt32LE(1,4);header.writeUInt32LE(28+feature.length+binary.length+batch.length+classes.length,8);header.writeUInt32LE(feature.length,12);header.writeUInt32LE(binary.length,16);header.writeUInt32LE(batch.length,20);header.writeUInt32LE(classes.length,24);
  return {bytes:Buffer.concat([header,feature,binary,batch,classes]),tileset:Buffer.from(JSON.stringify({asset:{version:'1.0'},geometricError:0,root:{boundingVolume:{box:[15.5,15.5,0,16,0,0,0,16,0,0,0,1]},geometricError:0,refine:'ADD',content:{uri:'classified.pnts'}}}))};
}
