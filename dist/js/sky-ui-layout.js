// Home is a schematic sky, not a calibrated camera bearing. Keep its visible
// discs clear of UI without changing astronomy, phase, horizon or visibility.
const epsilon=1e-7;
const finite=Number.isFinite;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rect=r=>r&&[r.left,r.top,r.right,r.bottom].every(finite)&&r.right>r.left&&r.bottom>r.top;
const distance=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function touches(p,r,radius){
 const dx=p.x-clamp(p.x,r.left,r.right),dy=p.y-clamp(p.y,r.top,r.bottom);
 return dx*dx+dy*dy<radius*radius-epsilon;
}
function onArc(p,a){return(a.sx*(p.x-a.x)>=-epsilon)&&(a.sy*(p.y-a.y)>=-epsilon);}
function boundaries(r,radius){
 const {left:l,right:h,top:t,bottom:b}=r;
 return[
  {x1:l,y1:t-radius,x2:h,y2:t-radius},{x1:l,y1:b+radius,x2:h,y2:b+radius},
  {x1:l-radius,y1:t,x2:l-radius,y2:b},{x1:h+radius,y1:t,x2:h+radius,y2:b},
  {x:l,y:t,r:radius,sx:-1,sy:-1},{x:h,y:t,r:radius,sx:1,sy:-1},
  {x:l,y:b,r:radius,sx:-1,sy:1},{x:h,y:b,r:radius,sx:1,sy:1}
 ];
}
function projection(p,s){
 if(s.r){const dx=p.x-s.x,dy=p.y-s.y,length=Math.hypot(dx,dy),q=length?{x:s.x+dx/length*s.r,y:s.y+dy/length*s.r}:null;
  return[q&&onArc(q,s)?q:null,{x:s.x+s.sx*s.r,y:s.y},{x:s.x,y:s.y+s.sy*s.r}].filter(Boolean);}
 const dx=s.x2-s.x1,dy=s.y2-s.y1,k=clamp(((p.x-s.x1)*dx+(p.y-s.y1)*dy)/(dx*dx+dy*dy||1),0,1);
 return[{x:s.x1+k*dx,y:s.y1+k*dy},{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}];
}
function intersections(a,b){
 if(!a.r&&!b.r){
  const ax=a.x2-a.x1,ay=a.y2-a.y1,bx=b.x2-b.x1,by=b.y2-b.y1,d=ax*by-ay*bx;
  if(Math.abs(d)<epsilon)return[];
  const t=((b.x1-a.x1)*by-(b.y1-a.y1)*bx)/d,u=((b.x1-a.x1)*ay-(b.y1-a.y1)*ax)/d;
  return t>=-epsilon&&t<=1+epsilon&&u>=-epsilon&&u<=1+epsilon?[{x:a.x1+t*ax,y:a.y1+t*ay}]:[];
 }
 if(a.r&&!b.r)return intersections(b,a);
 if(!a.r){
  const dx=a.x2-a.x1,dy=a.y2-a.y1,x=a.x1-b.x,y=a.y1-b.y,A=dx*dx+dy*dy,B=2*(x*dx+y*dy),C=x*x+y*y-b.r*b.r,D=B*B-4*A*C;
  if(!A||D<-epsilon)return[];
  return[(-B-Math.sqrt(Math.max(0,D)))/(2*A),(-B+Math.sqrt(Math.max(0,D)))/(2*A)].filter(t=>t>=-epsilon&&t<=1+epsilon).map(t=>({x:a.x1+t*dx,y:a.y1+t*dy})).filter(p=>onArc(p,b));
 }
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
 if(d<epsilon||d>a.r+b.r+epsilon||d<Math.abs(a.r-b.r)-epsilon)return[];
 const k=(a.r*a.r-b.r*b.r+d*d)/(2*d),h=Math.sqrt(Math.max(0,a.r*a.r-k*k)),x=a.x+dx*k/d,y=a.y+dy*k/d;
 return[{x:x-dy*h/d,y:y+dx*h/d},{x:x+dy*h/d,y:y-dx*h/d}].filter(p=>onArc(p,a)&&onArc(p,b));
}

// The nearest point outside the union of rounded rectangle obstacles lies on
// a boundary projection or a boundary intersection. This finite construction
// avoids a pixel search, random retries and persistent preferred positions.
export function solveSkyUiPosition(point,{bounds,obstacles=[],radius=0,padding=8}={}){
 if(!point||![point.x,point.y,radius].every(finite)||radius<=0||!rect(bounds))return point;
 const allowed={left:bounds.left+radius,right:bounds.right-radius,top:bounds.top+radius,bottom:bounds.bottom-radius};
 if(!rect(allowed)||point.x<allowed.left||point.x>allowed.right||point.y<allowed.top||point.y>allowed.bottom)return point;
 const pad=finite(padding)?Math.max(0,padding):8;
 const blocks=obstacles.filter(rect).slice(0,32).map(r=>({left:r.left-pad,right:r.right+pad,top:r.top-pad,bottom:r.bottom+pad}));
 if(!blocks.some(r=>touches(point,r,radius)))return point;
 const valid=p=>p.x>=allowed.left-epsilon&&p.x<=allowed.right+epsilon&&p.y>=allowed.top-epsilon&&p.y<=allowed.bottom+epsilon&&!blocks.some(r=>touches(p,r,radius));
 const edges=blocks.flatMap(r=>boundaries(r,radius));
 edges.push({x1:allowed.left,y1:allowed.top,x2:allowed.right,y2:allowed.top},{x1:allowed.left,y1:allowed.bottom,x2:allowed.right,y2:allowed.bottom},{x1:allowed.left,y1:allowed.top,x2:allowed.left,y2:allowed.bottom},{x1:allowed.right,y1:allowed.top,x2:allowed.right,y2:allowed.bottom});
 let best=null,bestDistance=Infinity;
 const consider=p=>{if(!p||!valid(p))return;const d=distance(point,p);
  // Equal-distance alternatives favor the higher free sky, then the left one.
  if(d<bestDistance-epsilon||Math.abs(d-bestDistance)<=epsilon&&(!best||p.y<best.y-epsilon||Math.abs(p.y-best.y)<=epsilon&&p.x<best.x)){best=p;bestDistance=d;}
 };
 for(const edge of edges)for(const p of projection(point,edge))consider(p);
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++)for(const p of intersections(edges[i],edges[j]))consider(p);
 return best||point; // A completely occupied sky retains its honest projection.
}

export function layoutSkyObjects(sky,{frame,viewport,obstacles=[],radii={},padding=8}={}){
 if(!sky||!frame||!viewport||![frame.left,frame.top,frame.width,frame.height,viewport.width,viewport.height].every(finite)||frame.width<=0||frame.height<=0||viewport.width<=0||viewport.height<=0||!obstacles.length)return sky;
 const horizon=finite(sky.horizonY)?frame.top+sky.horizonY/100*frame.height:frame.top+frame.height;
 const bounds={left:Math.max(0,frame.left),right:Math.min(viewport.width,frame.left+frame.width),top:Math.max(0,frame.top),bottom:Math.min(viewport.height,frame.top+frame.height,horizon)};
 const visibleBottom=Math.min(viewport.height,frame.top+frame.height),safeCenterTop=bounds.top+(visibleBottom-bounds.top)*.07;
 let output=sky;
 for(const body of ['sun','moon']){
  const x=sky[body+'X'],y=sky[body+'Y'];if(!(sky[body]>0)||![x,y].every(finite))continue;
  const original={x:frame.left+x/100*frame.width,y:frame.top+y/100*frame.height};
  const radius=radii[body]??(body==='sun'?clamp(viewport.width*.044,18,28)/2:clamp(frame.width*.05,18,32)/2);
  const bodyBounds={...bounds,top:Math.max(bounds.top,safeCenterTop-radius)};
  const next=solveSkyUiPosition(original,{bounds:bodyBounds,obstacles,radius,padding});
  if(next!==original){if(output===sky)output={...sky};output[body+'X']=(next.x-frame.left)/frame.width*100;output[body+'Y']=(next.y-frame.top)/frame.height*100;}
 }
 return output;
}
