// Spine.Unity.SkeletonRenderer.ApplyTransformMovementToPhysics, ARM32 1.6.3.
// Use model coordinates, never the camera's projected PIXI transform.
export function spineTransformDelta(previous,current,unitsPerWorld=100){
 const rotation=-current.rotation,angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),dx=current.XPos-previous.XPos,dy=current.YPos-previous.YPos;
 return {x:(c*dx+s*dy)/current.scaleX*unitsPerWorld,y:(-s*dx+c*dy)/current.scaleY*unitsPerWorld,rotation:rotation-(-previous.rotation)};
}
export function createSpineTransformPhysics(skeleton,{position=[1,1],rotation=1}={}){
 let previous=null;
 return transform=>{
  if(!transform){previous=null;return;}
  if(previous){
   const d=spineTransformDelta(previous,transform);
   skeleton.physicsTranslate(d.x*position[0],d.y*position[1]);
   skeleton.physicsRotate(0,0,d.rotation*rotation);
  }
  previous={XPos:transform.XPos,YPos:transform.YPos,rotation:transform.rotation,scaleX:transform.scaleX,scaleY:transform.scaleY};
 };
}
