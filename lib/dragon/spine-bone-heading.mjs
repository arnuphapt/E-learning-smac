// DragonEntity rotates/reflections its SkeletonUtilityBone root, not the
// SkeletonAnimation GameObject. Constraints must see that pose before solving.
export function createSpineBoneHeading(skeleton){
 const root=skeleton.findBone('root');
 if(!root||root.parent)throw Error('Unsupported adult heading hierarchy');
 let c=1,s=0,sx=1,sy=1;
 return {
  apply(transform){
   const degrees=transform?-(transform.rotation||0):0,r=degrees*Math.PI/180;
   c=Math.cos(r);s=Math.sin(r);sx=transform?Math.sign(transform.scaleX):1;sy=transform?Math.sign(transform.scaleY):1;
   root.rotation=degrees;root.scaleX=sx;root.scaleY=sy;
   // The external renderer retains item heading for hit tests and projection.
   // Its matching matrix is removed from emitted points, avoiding a second turn.
   return transform?{...transform,rotation:0,scaleX:Math.abs(transform.scaleX),scaleY:Math.abs(transform.scaleY)}:null;
  },
  toMeshPoint(x,y){return {x:(c*x+s*y)/sx,y:(-s*x+c*y)/sy};}
 };
}
