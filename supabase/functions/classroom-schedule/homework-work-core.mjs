import{normalizeReadingCheck,normalizeReadingReview}from '../../../dist/js/reading-check-core.js';
// Private homework exchange. Identities and lesson access are supplied by the verified scheduler.
export const WORK_OWNER_ACTIONS=['work-list','review-work'];
export const WORK_ACTIONS=['my-work','submit-work',...WORK_OWNER_ACTIONS,'prepare-work-file','finish-work-file','work-file','discard-work-file'];
export const WORK_FILE_LIMIT=6*1024*1024;
export const WORK_MIMES=Object.freeze({'image/jpeg':['photo','jpg'],'image/png':['photo','png'],'image/webp':['photo','webp'],'audio/mp4':['audio','m4a'],'audio/x-m4a':['audio','m4a'],'audio/mpeg':['audio','mp3'],'audio/webm':['audio','webm'],'audio/ogg':['audio','ogg'],'audio/wav':['audio','wav'],'audio/x-wav':['audio','wav']});
const filePattern=/^[A-Za-z0-9_-]{32}$/;
const ascii=(bytes,start,count)=>String.fromCharCode(...bytes.slice(start,start+count));
export function validWorkFileBytes(bytes,mime){
 if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>WORK_FILE_LIMIT)return false;
 if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/png')return Array.from(bytes.slice(0,8)).join(',')==='137,80,78,71,13,10,26,10';
 if(mime==='image/webp')return ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WEBP';
 if(['audio/mp4','audio/x-m4a'].includes(mime))return ascii(bytes,4,4)==='ftyp';
 if(mime==='audio/mpeg')return ascii(bytes,0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224;
 if(mime==='audio/webm')return Array.from(bytes.slice(0,4)).join(',')==='26,69,223,163';
 if(mime==='audio/ogg')return ascii(bytes,0,4)==='OggS';
 if(['audio/wav','audio/x-wav'].includes(mime))return ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WAVE';
 return false;
}
export const publicWorkFile=f=>({id:f.id,kind:f.kind,mime:f.mime,bytes:f.bytes});
export const publicWork=s=>s?{userId:s.userId,nickname:s.nickname,homeworkRevision:s.homeworkRevision,version:s.version,text:s.text||'',files:(s.files||[]).map(publicWorkFile),state:s.state,submittedAt:s.submittedAt,feedback:s.feedback||'',reviewedAt:s.reviewedAt||null,readingCheck:s.readingCheck||null,readingReview:s.readingReview||null}:null;
export function createHomeworkWorkService({db,storage,now=Date.now,fail}){
 const content=(value,max,label,optional=true)=>{if(typeof value!=='string')fail(400,'Проверьте '+label+'.');const text=value.replace(/\r\n?/g,'\n').trim();if((!optional&&!text)||text.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))fail(400,'Проверьте '+label+'.');return text;};
 return async({action,input,actor,row,isOwner,enrollment})=>{
  if(row.state==='cancelled')fail(410,'Занятие отменено.');
  if(!isOwner&&!enrollment)fail(403,'Запишитесь на занятие под своим аккаунтом.');
  const revision=Number(row.homeworkRevision)||0;
  const current=()=>{if(!row.homework?.text||input.homeworkRevision!==revision)fail(409,'Задание изменилось. Откройте актуальное ДЗ.');};
  const student=()=>{if(isOwner)fail(403,'Работу отправляет ученик из своего аккаунта.');};
  const owner=()=>{if(!isOwner||actor.owner!==true&&actor.teacher!==true)fail(403,'Только преподаватель проверяет работы.');};
  if(action==='work-list'){owner();return{works:(await db.listWorks(row.id)).map(publicWork)};}
  if(action==='my-work'){student();const own=await db.getWork(row.id,actor.id,revision);return{work:publicWork(own),homeworkRevision:revision};}
  if(action==='review-work'){
   owner();if(!/^[0-9a-f-]{36}$/i.test(input.studentId||'')||!Number.isInteger(input.homeworkRevision)||input.homeworkRevision<1||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1||!['accepted','needs_revision'].includes(input.state))fail(400,'Откройте работу заново.');
   const submitted=await db.getWork(row.id,input.studentId,input.homeworkRevision);if(!submitted)fail(404,'Работа недоступна.');if(submitted.version!==input.expectedVersion)fail(409,'Работа уже изменилась. Откройте её заново.');let readingReview=null;try{readingReview=normalizeReadingReview(input.readingMarks,submitted.readingCheck);}catch(error){fail(400,error.message);}
   const feedback=content(input.feedback??'',2000,'комментарий',input.state==='accepted'||Boolean(submitted.readingCheck));
   const result=await db.reviewWork(row,actor.id,{userId:input.studentId,homeworkRevision:input.homeworkRevision,expectedVersion:input.expectedVersion,state:input.state,feedback,readingReview,now:now()});
   if(!result)fail(409,'Ученик уже изменил работу. Откройте её заново.');return{work:publicWork(result)};
  }
  if(action==='prepare-work-file'){
   student();current();const mime=typeof input.mime==='string'?input.mime.toLowerCase().split(';')[0].trim():'';
   if(!WORK_MIMES[mime]||!Number.isInteger(input.bytes)||input.bytes<12||input.bytes>WORK_FILE_LIMIT)fail(400,'Прикрепите фото JPG, PNG, WebP или аудио до 6 МБ.');
   try{for(const file of await db.orphanWorkFiles())if(await db.claimOrphanWorkFile(file.path))await storage.remove(file.path);}catch{}
   const id=crypto.randomUUID().replaceAll('-',''),[kind,extension]=WORK_MIMES[mime],file={id,lessonId:row.id,userId:actor.id,homeworkRevision:revision,kind,mime,bytes:input.bytes,path:row.id+'/'+actor.id+'/'+revision+'/'+id+'.'+extension,createdAt:now(),state:'pending'};
   if(!await db.reserveWorkFile(row,file))fail(429,'Достигнут лимит загрузок. Повторите позже.');
   let uploadUrl;try{uploadUrl=await storage.signUpload(file.path);}catch{fail(503,'Не удалось подготовить загрузку. Повторите позже.');}
   return{file:publicWorkFile(file),uploadUrl};
  }
  if(['finish-work-file','work-file','discard-work-file'].includes(action)){
   if(!filePattern.test(input.fileId||''))fail(404,'Файл недоступен.');
   const file=await db.getWorkFile(input.fileId);
   if(!file||file.lessonId!==row.id||file.state==='deleted'||file.state==='invalid')fail(404,'Файл недоступен.');
   if(action==='work-file'){
    if(isOwner){owner();if(file.state!=='submitted')fail(403,'Ученик ещё не отправил этот файл.');}
    else if(file.userId!==actor.id||!['ready','submitted'].includes(file.state))fail(403,'Нет доступа к файлу.');
    return{url:await storage.signRead(file.path,300),expiresAt:now()+300000,file:publicWorkFile(file)};
   }
   student();current();if(file.userId!==actor.id||file.homeworkRevision!==revision)fail(403,'Нет доступа к файлу.');
   if(action==='discard-work-file'){
    if(file.state==='submitted')fail(409,'Отправленный файл сохраняется вместе с работой.');
    if(await db.changeWorkFile(file,'deleted'))await storage.remove(file.path).catch(()=>{});return{removed:true};
   }
   if(['ready','submitted'].includes(file.state))return{file:publicWorkFile(file)};
   if(file.state!=='pending'||now()-file.createdAt>2*3600000)fail(410,'Срок загрузки истёк. Прикрепите файл заново.');
   let bytes;try{bytes=await storage.download(file.path);}catch{fail(409,'Загрузка ещё не завершена. Повторите.');}
   if(bytes.length!==file.bytes||!validWorkFileBytes(bytes,file.mime)){
    await db.changeWorkFile(file,'invalid');await storage.remove(file.path).catch(()=>{});fail(400,'Формат файла не совпадает с содержимым. Выберите другой файл.');
   }
   if(!await db.changeWorkFile(file,'ready'))fail(409,'Файл изменился. Повторите загрузку.');return{file:publicWorkFile(file)};
  }
  if(action==='submit-work'){
   student();current();const text=content(input.text??'',2000,'текст ответа'),ids=input.fileIds??[];
   if(!Array.isArray(ids)||ids.length>6||new Set(ids).size!==ids.length||ids.some(id=>!filePattern.test(id||''))||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||input.expectedVersion>=2147483647)fail(400,'Проверьте прикреплённые файлы.');
   if(!text&&!ids.length)fail(400,'Добавьте текст, голосовую запись или фото.');
   const files=await Promise.all(ids.map(id=>db.getWorkFile(id)));
   if(files.some(f=>!f||f.lessonId!==row.id||f.userId!==actor.id||f.homeworkRevision!==revision||!['ready','submitted'].includes(f.state)))fail(403,'Один из файлов недоступен. Прикрепите его заново.');
   if(files.filter(f=>f.kind==='audio').length>1||files.filter(f=>f.kind==='photo').length>5)fail(400,'Можно отправить одну голосовую запись и до пяти фото.');
   if(row.homework.readingCheck&&!files.some(file=>file.kind==='audio'))fail(400,'Запишите чтение сочетаний или прикрепите аудиофайл.');
   const work={userId:actor.id,nickname:actor.nickname||'Ученик',homeworkRevision:revision,text,fileIds:ids,files:files.map(publicWorkFile),state:'submitted',submittedAt:now(),feedback:'',reviewedAt:null,readingCheck:row.homework.readingCheck?normalizeReadingCheck(row.homework.readingCheck):null,readingReview:null};
   const result=await db.submitWork(row,actor.id,input.expectedVersion,work);
   if(!result)fail(409,'Работа или задание изменились. Обновите ДЗ перед отправкой.');return{work:publicWork(result)};
  }
  fail(400,'Неизвестное действие с ДЗ.');
 };
}
