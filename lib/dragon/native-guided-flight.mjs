// GUIDED_CURVE: ComputeMigration -> rational B-spline -> Catmull-Rom,
// then MovementCommand.PlayMigrationMovement (native ARM32 1.6.3).
// FlyToPerchSlot supplies only two or three anchors; their native weights are 1.
export function guidedRoute(anchors){
 if(anchors.length>3)throw Error('Native perch approach supports at most three anchors');
 if(anchors.length<3)return anchors.map(p=>({...p}));
 const [a,b,c]=anchors,count=Math.floor(Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(c.x-b.x,c.y-b.y));
 if(!count)return anchors.map(p=>({...p}));
 const nodes=[{...a}];
 for(let i=2;i<=count;i++){const t=i/count,u=1-t;nodes.push({x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y});}
 return nodes;
}
export function catmullPoint(nodes,index,t){
 const p=offset=>nodes[Math.max(0,Math.min(nodes.length-1,index+offset))],a=p(-1),b=p(0),c=p(1),d=p(2);
 const axis=k=>.5*(2*b[k]+(c[k]-a[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
 return {x:axis('x'),y:axis('y')};
}
export function beginGuidedFlight(control,nodes,speed,type=0){
 control.guidedFlight={nodes,index:0,lerp:0,type,lerpSpeed:nodes.length>1?speed/Math.max(1e-7,Math.hypot(nodes[1].x-nodes[0].x,nodes[1].y-nodes[0].y)):speed*.5};
 control.route=nodes.slice(1).map(p=>({...p}));
}
export function stepGuidedFlight(control,dt,speed){
 const m=control.guidedFlight;if(!m)return null;
 if(m.lerp>=1){
  m.index++;m.lerp-=1;
  if(m.index>=m.nodes.length-1){Object.assign(control,m.nodes.at(-1));control.route=[];control.movingSpeed=-1;delete control.guidedFlight;return {finished:true,dx:0,dy:0};}
  const seg=Math.max(1e-7,Math.hypot(m.nodes[m.index+1].x-m.nodes[m.index].x,m.nodes[m.index+1].y-m.nodes[m.index].y));
  if(m.type===1){
   const first=m.nodes[0],last=m.nodes.at(-1),pos=m.nodes[m.index],den=Math.hypot(last.x-first.x,last.y-first.y);
   const p=den>0?Math.min(1,Math.max(0,Math.hypot(pos.x-first.x,pos.y-first.y)/den)):0;
   m.lerpSpeed=(den>0?2*Math.exp(-Math.pow(2*p-1,2)):1)*speed/seg;
  }else m.lerpSpeed=speed/seg;
 }
 const point=catmullPoint(m.nodes,m.index,m.lerp),dx=point.x-control.x,dy=point.y-control.y;
 if(dt>0)m.lerpSpeed=Math.min(m.lerpSpeed,1/dt);
 m.lerp+=m.lerpSpeed*Math.max(0,dt);
 Object.assign(control,point);control.movingSpeed=speed;control.route=m.nodes.slice(m.index+1).map(p=>({...p}));
 return {finished:false,dx,dy};
}
export function advanceGuidedNode(control,speed){
 const m=control.guidedFlight;if(!m)return;
 m.index++;m.lerp=0;
 if(m.index>=m.nodes.length-1){control.route=[];control.movingSpeed=-1;delete control.guidedFlight;return;}
 const seg=Math.max(1e-7,Math.hypot(m.nodes[m.index+1].x-m.nodes[m.index].x,m.nodes[m.index+1].y-m.nodes[m.index].y));
 if(m.type===1){
  const first=m.nodes[0],last=m.nodes.at(-1),pos=m.nodes[m.index],den=Math.hypot(last.x-first.x,last.y-first.y);
  const p=den>0?Math.min(1,Math.max(0,Math.hypot(pos.x-first.x,pos.y-first.y)/den)):0;
  m.lerpSpeed=(den>0?2*Math.exp(-Math.pow(2*p-1,2)):1)*speed/seg;
 }else m.lerpSpeed=speed/seg;
 control.route=m.nodes.slice(m.index+1).map(p=>({...p}));
}
