// Original acoustic landmark matcher for indexed recordings, processed entirely on device.
export const RECOGNITION_RATE=8000,RECOGNITION_HOP=256,RECOGNITION_FFT=1024;
const N=RECOGNITION_FFT;
const hann=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
const reverse=Uint16Array.from({length:N},(_,i)=>{let r=0;for(let j=0;j<10;j++){r=(r<<1)|(i&1);i>>=1;}return r;});
function spectrum(samples,start,re,im){
 for(let i=0;i<N;i++){re[reverse[i]]=(samples[start+i]||0)*hann[i];im[reverse[i]]=0;}
 for(let size=2;size<=N;size*=2){const half=size/2,angle=-2*Math.PI/size;for(let first=0;first<N;first+=size){let wr=1,wi=0;const cr=Math.cos(angle),ci=Math.sin(angle);for(let j=0;j<half;j++){const a=first+j,b=a+half,tr=wr*re[b]-wi*im[b],ti=wr*im[b]+wi*re[b];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=next;}}}
 const row=new Float32Array(400);for(let f=16;f<400;f++)row[f]=10*Math.log10(1e-12+re[f]*re[f]+im[f]*im[f]);return row;
}
export function acousticLandmarks(samples){
 if(!(samples instanceof Float32Array)||samples.length<RECOGNITION_RATE*2)return [];
 const frames=Math.floor((samples.length-N)/RECOGNITION_HOP)+1,re=new Float64Array(N),im=new Float64Array(N),rows=[],peaks=[];
 for(let t=0;t<frames;t++)rows.push(spectrum(samples,t*RECOGNITION_HOP,re,im));
 for(let t=3;t<frames-3;t++){
  const row=rows[t],max=Math.max(...row.subarray(20,380)),candidates=[];
  if(max< -35)continue;
  for(let f=20;f<380;f++){
   const v=row[f];if(v<max-32)continue;let greater=false;
   for(let dt=-3;dt<=3&&!greater;dt++)for(let df=-4;df<=4;df++)if((dt||df)&&rows[t+dt][f+df]>=v){greater=true;break;}
   if(greater)continue;let mean=0;for(let df=-9;df<=9;df++)mean+=row[f+df];const contrast=v-mean/19;if(contrast<3)continue;candidates.push({t,f,score:contrast+(v-max)*.15});
  }
  candidates.sort((a,b)=>b.score-a.score);peaks.push(...candidates.slice(0,3));
 }
 const marks=[],seen=new Set();
 for(let i=0;i<peaks.length;i++){
  const p=peaks[i];if(p.t%2)continue;let count=0;
  for(let j=i+1;j<peaks.length;j++){const q=peaks[j],dt=q.t-p.t;if(dt>64)break;if(dt<4)continue;const hash=((p.f>>1)<<14)|((q.f>>1)<<6)|(dt>>1),key=hash+':'+p.t;if(seen.has(key))continue;seen.add(key);marks.push([hash,p.t]);if(++count===5)break;}
 }
 return marks;
}
export function resampleRecognition(channels,rate){
 if(!Array.isArray(channels)||!channels.length||!Number.isFinite(rate)||rate<8000||rate>192000)throw Error('Неподдерживаемое аудио');
 const count=Math.min(channels[0].length,rate*30),length=Math.floor(count*RECOGNITION_RATE/rate),samples=new Float32Array(length);
 for(let i=0;i<length;i++){const p=i*rate/RECOGNITION_RATE,a=Math.floor(p),mix=p-a;let sum=0;for(const channel of channels)sum+=(channel[a]||0)*(1-mix)+(channel[a+1]||0)*mix;samples[i]=sum/channels.length;}
 return samples;
}
export function matchAcousticLandmarks(query,pairs,tracks){
 if(!Array.isArray(query)||query.length<15||!(pairs instanceof Uint32Array)||pairs.length%2)return null;
 const votes=new Map(),rows=pairs.length/2;
 for(const [hash,time]of query){let lo=0,hi=rows;while(lo<hi){const mid=(lo+hi)>>1;if(pairs[mid*2]<hash)lo=mid+1;else hi=mid;}const start=lo;while(lo<rows&&pairs[lo*2]===hash)lo++;if(lo-start>80)continue;
  for(let i=start;i<lo;i++){const code=pairs[i*2+1],track=code>>>24,reference=code&0xffffff,offset=reference-time,bucket=Math.floor(offset/4);for(const b of [bucket,bucket+1]){const key=track+':'+b;let v=votes.get(key);if(!v){v={track,bucket:b,times:new Map()};votes.set(key,v);}if(!v.times.has(time))v.times.set(time,offset);}}
 }
 const candidates=[...votes.values()].sort((a,b)=>b.times.size-a.times.size),best=candidates[0];if(!best)return null;
 const runner=candidates.find(v=>v.track!==best.track),score=best.times.size,times=[...best.times.keys()].sort((a,b)=>a-b),span=(times.at(-1)-times[0])*RECOGNITION_HOP/RECOGNITION_RATE;
 if(score<12||span<1.5||runner&&(score<runner.times.size*1.5||score-runner.times.size<5))return null;
 const offsets=[...best.times.values()].sort((a,b)=>a-b),offset=offsets[Math.floor(offsets.length/2)],center=times[Math.floor(times.length/2)],at=(offset+center)*RECOGNITION_HOP/RECOGNITION_RATE,track=tracks[best.track];if(!track||at<0||at>track.duration)return null;
 const row=track.timings.find(r=>at>=r.start&&at<r.end);if(!row?.ayah)return null;
 return{reciter:track.reciter,surah:track.surah,ayah:row.ayah,at,queryAt:center*RECOGNITION_HOP/RECOGNITION_RATE,matchedAnchors:score,span};
}
