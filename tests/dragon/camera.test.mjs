import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {CAMERA_LIMITS,backdropBounds,constrainCamera} from '../../lib/dragon/camera.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../../public/dragon/data/source-map.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/manifest.json',import.meta.url)));
const bounds={left:-78.3,right:78.3,top:39.2,bottom:-100},backdrop=backdropBounds(map,manifest);
test('normal camera caps zoom and keeps viewport inside source map and background at multiple aspect ratios',()=>{
 for(const [width,height]of [[1993,1200],[1280,900],[390,844],[3200,800]])for(const x of [-1000,0,1000])for(const y of [-1000,0,1000])for(const z of [-100000,-9000,-1]){
  const c={x,y,z,fov:.25,far:20000},screen={width,height};constrainCamera(c,screen,bounds,{backdrop});const half=-c.z*Math.tan(c.fov*Math.PI/360),aspect=width/height,bh=(backdrop.z-c.z)*Math.tan(c.fov*Math.PI/360);
  assert(half*2<=CAMERA_LIMITS.maxViewHeight+1e-8);assert(half*aspect*2<=CAMERA_LIMITS.maxViewWidth+1e-8);assert(-c.z>=1600);
  assert(c.x-half*aspect>=bounds.left-1e-8&&c.x+half*aspect<=bounds.right+1e-8);assert(c.y-half>=bounds.bottom-1e-8&&c.y+half<=bounds.top+1e-8);
  assert(c.x-bh*aspect>=backdrop.left-1e-8&&c.x+bh*aspect<=backdrop.right+1e-8);assert(c.y-bh>=backdrop.bottom-1e-8&&c.y+bh<=backdrop.top+1e-8);
 }
});
test('Dev can inspect the entire scene; leaving Dev clamps the same camera immediately',()=>{const c={x:0,y:-30,z:-40000,fov:.25},s={width:1280,height:900};constrainCamera(c,s,bounds,{dev:true,backdrop});assert.equal(c.z,-40000);constrainCamera(c,s,bounds,{backdrop});assert(-c.z<12000);});
test('camera constraints are idempotent at the zoom and pan limits',()=>{const c={x:-1000,y:-1000,z:-100000,fov:.25},s={width:1993,height:1200};constrainCamera(c,s,bounds,{backdrop});const once={...c};for(let i=0;i<100;i++)constrainCamera(c,s,bounds,{backdrop});assert.deepEqual(c,once);});
