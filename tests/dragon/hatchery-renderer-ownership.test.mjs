import test from 'node:test';
import assert from 'node:assert/strict';
import {createHatcheryRenderer} from '../../lib/dragon/hatchery-renderer.mjs';

function rendererFixture(entries){return createHatcheryRenderer({PIXI:{},map:{MapItemData:[],LayerData:[]},entries,loadTexture:async()=>({}),sortScene(){},invalidate(){}});}

test('hidden bugs and foreign scene entries are not sampled as hatchery animation packs',()=>{
 const bug=Object.freeze({bug:{id:'hidden-bug-test'},mesh:{},parts:[],lastKey:null});
 const foreign={actorId:'other-system',kind:'other-system',mesh:{},get data(){throw Error('Foreign animation data was read');}};
 const entries=[bug,foreign],renderer=rendererFixture(entries);
 assert.doesNotThrow(()=>renderer.update(0,false));
 assert.doesNotThrow(()=>renderer.update(1,true));
 assert.deepEqual(entries,[bug,foreign]);
});

test('destroying the hatchery leaves other scene systems and their meshes alive',()=>{
 let bugDestroyed=0,foreignDestroyed=0,eggDestroyed=0;
 const bug={bug:{id:'hidden-bug-test'},mesh:{destroy(){bugDestroyed++;}}};
 const foreign={actorId:'other-system',kind:'other-system',mesh:{destroy(){foreignDestroyed++;}}};
 const egg={actorId:'egg-test',kind:'egg',mesh:{destroy(){eggDestroyed++;}}};
 const entries=[bug,egg,foreign],renderer=rendererFixture(entries);
 renderer.destroy();renderer.destroy();
 assert.deepEqual(entries,[bug,foreign]);
 assert.equal(bugDestroyed,0);assert.equal(foreignDestroyed,0);assert.equal(eggDestroyed,1);
});
