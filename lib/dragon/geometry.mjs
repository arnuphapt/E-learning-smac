// Unity Sprite geometry: positions are already in units relative to the pivot.
// Preserve tight meshes instead of drawing their rectangular atlas envelopes.
export function parseVector(text, key) {
  const line=text.match(new RegExp('(?:^|\\n)\\s*'+key+': \\{([^}]+)\\}'))?.[1];
  if(!line) throw new Error('Missing vector '+key);
  return Object.fromEntries([...line.matchAll(/(\w+):\s*([-+\deE.]+)/g)].map(m=>[m[1],Number(m[2])]));
}
export function parseSprite(text, width, height) {
  const count=Number(text.match(/m_VertexCount:\s*(\d+)/)?.[1]);
  const raw=Buffer.from(text.match(/_typelessdata:\s*([a-f\d]+)/i)?.[1]||'','hex');
  const channels=[...text.matchAll(/- stream: (\d+)\s+offset: (\d+)\s+format: (\d+)\s+dimension: (\d+)/g)].slice(0,14).map(m=>m.slice(1).map(Number));
  const position=channels[0];
  if(!count||!position||position[2]!==0||position[3]!==3) throw Error('Unsupported sprite position stream');
  const strides=new Map();for(const [stream,offset,format,dim] of channels){if(!dim)continue;if(format!==0)throw Error('Unsupported vertex format '+format);strides.set(stream,Math.max(strides.get(stream)||0,offset+dim*4));}
  const offsets=new Map();let offset=0;for(const [stream,stride] of [...strides].sort((a,b)=>a[0]-b[0])){offsets.set(stream,offset);offset=Math.ceil((offset+stride*count)/16)*16;}
  const ppu=Number(text.match(/m_PixelsToUnits:\s*([^\n]+)/)[1]);
  const pivot=parseVector(text,'m_Pivot'),uvTransform=parseVector(text,'uvTransform');
  const rectBlock=text.match(/  m_Rect:\s*serializedVersion: \d+\s+x: ([^\n]+)\s+y: ([^\n]+)\s+width: ([^\n]+)\s+height: ([^\n]+)/);
  const rect={x:+rectBlock[1],y:+rectBlock[2],width:+rectBlock[3],height:+rectBlock[4]};
  const packed=text.match(/    textureRect:\s*serializedVersion: \d+\s+x: ([^\n]+)\s+y: ([^\n]+)\s+width: ([^\n]+)\s+height: ([^\n]+)/);
  const atlasRect={x:+packed[1],y:+packed[2],width:+packed[3],height:+packed[4]};
  const settings=+text.match(/settingsRaw: (\d+)/)[1],rotation=(settings>>2)&15;
  const vertices=[],uvs=[];let uvFromTransform=false;
  const uvChannel=channels[4];let uvValues=[];
  if(uvChannel?.[3]===2){for(let i=0;i<count;i++){let j=offsets.get(uvChannel[0])+i*strides.get(uvChannel[0])+uvChannel[1];uvValues.push(raw.readFloatLE(j),raw.readFloatLE(j+4));}}
  uvFromTransform=!uvValues.some(v=>v!==0);
  for(let i=0;i<count;i++){
    const j=offsets.get(position[0])+i*strides.get(position[0])+position[1],x=raw.readFloatLE(j),y=raw.readFloatLE(j+4);
    vertices.push(x,-y);
    let u,v;
    if(!uvFromTransform){u=uvValues[i*2];v=uvValues[i*2+1];}
    else {
      let px=x*uvTransform.x+uvTransform.y,py=y*uvTransform.z+uvTransform.w;
      if(rotation===1||rotation===3)px=2*atlasRect.x+atlasRect.width-px;
      if(rotation===2||rotation===3)py=2*atlasRect.y+atlasRect.height-py;
      if(rotation>3)throw Error('Unsupported packing rotation '+rotation);
      u=px/width;v=py/height;
    }
    uvs.push(u,1-v);
  }
  const ib=Buffer.from(text.match(/m_IndexBuffer:\s*([a-f\d]+)/i)[1],'hex'),indices=[];
  for(let i=0;i<ib.length;i+=2)indices.push(ib.readUInt16LE(i));
  if(indices.some(i=>i>=count))throw Error('Sprite index out of bounds');
  if([...vertices,...uvs].some(v=>!Number.isFinite(v)))throw Error('Non-finite geometry');
  return {vertices,uvs,indices,ppu,pivot,rect,atlasRect,packingRotation:rotation,uvSource:uvFromTransform?'uvTransform (exported UV channel is zero)':'vertex-channel'};
}
function clipPoly(poly,axis,bound,keepGreater){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=keepGreater?a[axis]>=bound:a[axis]<=bound,bi=keepGreater?b[axis]>=bound:b[axis]<=bound;if(ai)result.push(a);if(ai!==bi){const t=(bound-a[axis])/(b[axis]-a[axis]);result.push(a.map((v,k)=>v+(b[k]-v)*t));}}return result;}
export function tileGeometry(sprite,sizeX,sizeY){
  const width=Math.abs(sizeX),height=Math.abs(sizeY),tw=sprite.rect.width/sprite.ppu,th=sprite.rect.height/sprite.ppu;
  if(!width||!height||!tw||!th)throw Error('Invalid tile dimensions');
  const left=-width*sprite.pivot.x,top=-height*(1-sprite.pivot.y),right=left+width,bottom=top+height;
  const baseLeft=-tw*sprite.pivot.x,baseTop=-th*(1-sprite.pivot.y),nx=Math.ceil(width/tw),ny=Math.ceil(height/th),out={vertices:[],uvs:[],indices:[]};
  if(nx*ny>20000)throw Error('Unexpected tile count');
  for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
    const dx=left+ix*tw-baseLeft,dy=top+iy*th-baseTop;
    for(let t=0;t<sprite.indices.length;t+=3){let p=sprite.indices.slice(t,t+3).map(i=>[sprite.vertices[i*2]+dx,sprite.vertices[i*2+1]+dy,sprite.uvs[i*2],sprite.uvs[i*2+1]]);for(const [axis,bound,more] of [[0,left,true],[0,right,false],[1,top,true],[1,bottom,false]])p=clipPoly(p,axis,bound,more);if(p.length<3)continue;const start=out.vertices.length/2;for(const a of p){out.vertices.push(a[0],a[1]);out.uvs.push(a[2],a[3]);}for(let k=1;k<p.length-1;k++)out.indices.push(start,start+k,start+k+1);}
  }
  return out;
}
export function projectItem(item,layerZ,camera,screen){
  const z=layerZ+item.ZPos,depth=z-camera.z;
  if(depth<=camera.near||depth>=camera.far)return null;
  const f=screen.height/(2*Math.tan(camera.fov*Math.PI/360)),scale=f/depth;
  // Map rotation is authored clockwise in screen space. Sprite vertices already
  // have their Y inverted during decoding; negating this angle again reverses
  // authored tilts (visible on power_line_2_0, placement g920361676).
  return {x:screen.width/2+(item.XPos-camera.x)*scale,y:screen.height/2-(item.YPos-camera.y)*scale,scale,z,rotation:item.rotation*Math.PI/180};
}
