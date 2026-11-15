import{t,getLocale}from './i18n.js';
import{uiError}from './ui.js';
const KEYS=['Fajr','Sunrise','Dhuhr','AsrFirst','AsrHanafi','Maghrib','Isha'];
const PAGE=[595.2756,841.8898];
export function monthDates(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw uiError('calendarPdfUi.invalidMonth');
 const [year,m]=month.split('-').map(Number);
 if(year<1900||year>2200)throw uiError('calendarPdfUi.yearRange');
 const count=new Date(Date.UTC(year,m,0)).getUTCDate();
 return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
}
export function monthRows(month,getTimes,format){
 const locale=getLocale();return monthDates(month).map(day=>{
  const times=getTimes(day);
  if(!times||KEYS.some(key=>!Number.isFinite(times[key])))throw uiError('calendarPdfUi.monthIncomplete');
  const date=new Date(day+'T12:00:00Z');
  return {day,date:day.slice(8),weekday:new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(date),friday:date.getUTCDay()===5,values:KEYS.map(key=>format(times[key]))};
 });
}
// One A4 page with a high-resolution image: Cyrillic remains portable on phones
// without downloading third-party PDF libraries or fonts.
export function jpegPdf(jpeg,width,height){
 const encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
 const push=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.byteLength};
 const object=(id,body)=>{offsets[id]=length;push(id+' 0 obj\n'+body+'\nendobj\n')};
 push('%PDF-1.4\n%SALAH\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE.join(' ')+'] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
 const content='q '+PAGE[0]+' 0 0 '+PAGE[1]+' 0 0 cm /Im0 Do Q\n';
 object(4,'<< /Length '+encoder.encode(content).length+' >>\nstream\n'+content+'endstream');
 offsets[5]=length;push('5 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.byteLength+' >>\nstream\n');push(jpeg);push('\nendstream\nendobj\n');
 object(6,'<< /Title (SALAH monthly prayer timetable) /Producer (SALAH) >>');
 const xref=length;push('xref\n0 7\n0000000000 65535 f \n');for(let i=1;i<=6;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(parts,{type:'application/pdf'});
}
export async function createMonthCanvas({month,city,rows,source,localAsr=false}){
 const locale=getLocale(),direction=locale.startsWith('ar')?'rtl':'ltr',labels=Object.fromEntries(['calendarPdfUi.heading','calendarPdfUi.localAsr','calendarPdfUi.twoAsr','calendarPdfUi.day','calendarPdfUi.sunrise','calendarPdfUi.threeImams','calendarPdfUi.mosques','calendarPdfUi.hanafi','calendarPdfUi.sunriseNote','calendarPdfUi.settingsNote','calendarPdfUi.logoFailed','calendarUi.date','home.fajr','home.dhuhr','home.asr','home.maghrib','home.isha'].map(key=>[key,t(key)])),sourceLabel=t('calendarPdfUi.source',{source});
 if(rows.length!==monthDates(month).length)throw uiError('calendarPdfUi.daysRequired');
 const scale=3,canvas=document.createElement('canvas');canvas.width=Math.round(PAGE[0]*scale);canvas.height=Math.round(PAGE[1]*scale);
 const ctx=canvas.getContext('2d');if(!ctx)throw uiError('calendarPdfUi.prepareFailed');ctx.scale(scale,scale);ctx.direction=direction;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,...PAGE);
 const navy='#14233b',gold='#927843',muted='#5c6571';
 function text(value,x,y,size=10,color=navy,align='left',weight=400,maxWidth=523){
  ctx.direction=/^[\d\s:./-]+$/.test(String(value))?'ltr':direction;ctx.textAlign=align;ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial, sans-serif';
  while(ctx.measureText(String(value)).width>maxWidth&&size>6){size-=.25;ctx.font=weight+' '+size+'px Arial, sans-serif'}
  ctx.fillText(String(value),x,y);
 }
 const response=await fetch(new URL('../assets/salah-mark.svg',import.meta.url));if(!response.ok)throw Error(labels['calendarPdfUi.logoFailed']);
 const imageUrl=URL.createObjectURL(await response.blob());
 try{const image=new Image();image.src=imageUrl;await image.decode();ctx.drawImage(image,36,30,52,52)}finally{URL.revokeObjectURL(imageUrl)}
 ctx.fillStyle=navy;ctx.font='32px Georgia, serif';ctx.fillText('SALAH',101,57);
 text(labels['calendarPdfUi.heading'],102,76,9,muted);
 const date=new Date(month+'-01T12:00:00Z');
 text(new Intl.DateTimeFormat(locale,{month:'long',timeZone:'UTC'}).format(date).toLocaleUpperCase(locale),559,53,20,navy,'right',600,220);
 text(month.slice(0,4),559,76,12,muted,'right');
 text(city,36,122,23,navy,'left',600);
 text(labels[localAsr?'calendarPdfUi.localAsr':'calendarPdfUi.twoAsr'],36,144,9,muted);
 ctx.fillStyle=gold;ctx.fillRect(36,161,523,1);
 const widths=[34,27,...Array(7).fill((523-61)/7)],headings=['calendarUi.date','calendarPdfUi.day','home.fajr','calendarPdfUi.sunrise','home.dhuhr','home.asr','home.asr','home.maghrib','home.isha'].map(key=>labels[key]),centers=[];let x=36;
 for(const width of widths){centers.push(x+width/2);x+=width}
 const top=181,headHeight=29,rowHeight=16.8;ctx.fillStyle=navy;ctx.fillRect(36,top,523,headHeight);
 headings.forEach((label,i)=>{const second=i===6||i===5&&!localAsr;text(label,centers[i],top+(second?12:19),8.8,'#ffffff','center',600,widths[i]-5);if(second)text(labels[i===5?'calendarPdfUi.threeImams':localAsr?'calendarPdfUi.mosques':'calendarPdfUi.hanafi'],centers[i],top+23,7,'#ffffff','center',400,widths[i]-5)});
 rows.forEach((row,index)=>{const y=top+headHeight+index*rowHeight;
  ctx.fillStyle=row.friday?'#f7f0df':index%2?'#f4f6f8':'#ffffff';ctx.fillRect(36,y,523,rowHeight);
  [row.date,row.weekday,...row.values].forEach((value,i)=>text(value,centers[i],y+11.6,9,i===3?muted:row.friday?gold:navy,'center',row.friday?600:400,widths[i]-4));
  ctx.strokeStyle='#e0e4e9';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(36,y+rowHeight);ctx.lineTo(559,y+rowHeight);ctx.stroke();
 });
 text(labels['calendarPdfUi.sunriseNote'],36,759,8.5,muted);
 text(sourceLabel,36,777,8.5,muted);
 text(labels['calendarPdfUi.settingsNote'],36,793,8,muted);
 text('SALAH',559,819,8.5,gold,'right');
 return canvas;
}
export async function createMonthFile(options,format='pdf'){
 if(!['pdf','png'].includes(format))throw uiError('calendarPdfUi.format');
 const canvas=await createMonthCanvas(options);
 const image=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(uiError('calendarUi.prepareFailed')),format==='png'?'image/png':'image/jpeg',.96));
 return format==='png'?image:jpegPdf(new Uint8Array(await image.arrayBuffer()),canvas.width,canvas.height);
}
