export function mapPoint(latitude,longitude){if(!Number.isFinite(latitude)||Math.abs(latitude)>85.05112878||!Number.isFinite(longitude))return null;return{latitude,longitude:((longitude+180)%360+360)%360-180};}
export function qiblaMapRay(latitude,longitude,bearing,metres){
 if(!mapPoint(latitude,longitude)||!Number.isFinite(bearing)||!Number.isFinite(metres)||metres<=0)return [];
 const r=Math.PI/180,p=latitude*r,l=longitude*r,a=bearing*r,d=metres/6371008.8,points=[[latitude,longitude]];
 for(let i=1;i<=16;i++){const delta=d*i/16,lat=Math.asin(Math.sin(p)*Math.cos(delta)+Math.cos(p)*Math.sin(delta)*Math.cos(a)),lon=l+Math.atan2(Math.sin(a)*Math.sin(delta)*Math.cos(p),Math.cos(delta)-Math.sin(p)*Math.sin(lat));points.push([lat/r,longitude+((lon/r-longitude+540)%360-180)]);}
 return points;
}
