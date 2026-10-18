export function mapPoint(latitude,longitude){if(!Number.isFinite(latitude)||Math.abs(latitude)>85.05112878||!Number.isFinite(longitude))return null;return{latitude,longitude:((longitude+180)%360+360)%360-180};}
export function qiblaMapRay(latitude,longitude,bearing,metres){
 if(!mapPoint(latitude,longitude)||!Number.isFinite(bearing)||!Number.isFinite(metres)||metres<=0)return [];
 const r=Math.PI/180,p=latitude*r,l=longitude*r,a=bearing*r,d=metres/6371008.8,points=[[latitude,longitude]];
 for(let i=1;i<=16;i++){const delta=d*i/16,lat=Math.asin(Math.sin(p)*Math.cos(delta)+Math.cos(p)*Math.sin(delta)*Math.cos(a)),lon=l+Math.atan2(Math.sin(a)*Math.sin(delta)*Math.cos(p),Math.cos(delta)-Math.sin(p)*Math.sin(lat));points.push([lat/r,longitude+((lon/r-longitude+540)%360-180)]);}
 return points;
}

// Keep the arrowhead inside the viewport even when pitch makes the far map edge much longer.
export function fitQiblaMapRay(latitude,longitude,heading,metres,{project,width,height}){
 const raw=qiblaMapRay(latitude,longitude,heading,metres);if(!raw.length||!(width>60&&height>60))return raw;const inside=p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=24&&p.y>=24&&p.x<=width-24&&p.y<=height-24,origin=project([longitude,latitude]);if(!inside(origin))return raw;
 const endpoint=distance=>{const end=qiblaMapRay(latitude,longitude,heading,distance).at(-1);return project([end[1],end[0]]);};if(inside(endpoint(metres)))return raw;let low=0,high=metres;for(let i=0;i<16;i++){const middle=(low+high)/2;if(inside(endpoint(middle)))low=middle;else high=middle;}return low>0?qiblaMapRay(latitude,longitude,heading,low*.94):raw;
}
