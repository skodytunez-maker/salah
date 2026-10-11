import{PROJECT,validateDraftPayload,jpegUpload}from './core.mjs';
const PUBLIC=PROJECT+'/storage/v1/object/public/salah-curated/';
const conflict=code=>{throw Object.assign(new Error(code),{code:'P0001'});};
export function skyMask(width,height,fraction){return new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'"><rect width="'+width+'" height="'+Math.round(height*fraction)+'" fill="white"/></svg>');}
export function createPublisher({rpc,storage,seeds,uuid=()=>crypto.randomUUID()}){
 return async(args,claims,actor)=>{
  const draft=await rpc('draft.get',{id:args.id,kind:args.kind},claims);
  if(!actor.owner)throw Object.assign(new Error('owner_only'),{code:'42501'});
  if(draft.status!=='submitted'||draft.revision!==args.revision)conflict('revision_conflict');
  const input=validateDraftPayload(draft.kind,draft.payload,draft.entity_id);
  const assets=await rpc('asset.list',{id:args.id,kind:draft.kind},claims);
  const baseline=await storage.catalog(draft.kind,draft.entity_id)||seeds[draft.kind].find(x=>x.id===draft.entity_id)||null;
  const uploads=[],nonce=uuid();
  const image=async(assetId,slot)=>{
   const asset=assets.find(a=>a.id===assetId);if(!asset)throw Object.assign(new Error('invalid_asset'),{status:400});
   const picture=jpegUpload(await storage.download('salah-staff-drafts',asset.path));
   const path=draft.kind+'/'+draft.entity_id+'/'+nonce+'/'+slot+'.jpg';
   await storage.upload('salah-curated',path,picture.bytes,{contentType:'image/jpeg',cacheControl:'31536000'});uploads.push(path);
   return{url:PUBLIC+path,width:picture.width,height:picture.height};
  };
  const pair=async(dayId,nightId,sky,slot)=>{
   const day=await image(dayId,slot+'-day'),night=await image(nightId,slot+'-night');
   if(day.width!==night.width||day.height!==night.height)throw Object.assign(new Error('paired_dimensions_required'),{status:400});
   if(slot==='phone'&&day.height/day.width<1.3||slot==='tablet'&&day.width/day.height<1.2)throw Object.assign(new Error('image_orientation_required'),{status:400});
   const path=draft.kind+'/'+draft.entity_id+'/'+nonce+'/'+slot+'-sky.svg';
   await storage.upload('salah-curated',path,skyMask(day.width,day.height,sky),{contentType:'image/svg+xml',cacheControl:'31536000'});uploads.push(path);
   return{day:day.url,night:night.url,mask:PUBLIC+path};
  };
  try{
   let payload;
   if(draft.kind==='reciter'){
    payload={...(baseline||{}),id:draft.entity_id,name:input.name};
    for(const field of ['format','server','folder','availableSurahs','group'])if(Object.hasOwn(input,field))payload[field]=input[field];
    if(input.portraitAsset)payload.portrait=(await image(input.portraitAsset,'portrait')).url;
    if(!payload.portrait||!['verse','surah'].includes(payload.format)||payload.format==='surah'&&!payload.server||payload.format==='verse'&&!payload.folder&&!baseline)throw Object.assign(new Error('incomplete_reciter'),{status:400});
    // Timing/source identity stays valid only when the audio source is unchanged.
    if(baseline&&(payload.server!==baseline.server||payload.folder!==baseline.folder||payload.format!==baseline.format))for(const key of ['timingRead','timingServer','continuousReciter','variantOf','source','sourceApi','verifiedOn'])delete payload[key];
   }else{
    payload={...(baseline||{}),id:draft.entity_id,name:input.name,landmark:input.landmark,latitude:input.latitude,longitude:input.longitude,radius:input.radius};
    if(input.phoneDayAsset){Object.assign(payload,await pair(input.phoneDayAsset,input.phoneNightAsset,input.skyPhone,'phone'));delete payload.fitSubject;delete payload.focalX;delete payload.focalY;}
    if(input.tabletDayAsset)payload.tablet=await pair(input.tabletDayAsset,input.tabletNightAsset,input.skyTablet,'tablet');
    if(!payload.day||!payload.night||!payload.mask||!payload.tablet)throw Object.assign(new Error('paired_images_required'),{status:400});
   }
   return await rpc('catalog.publish',{id:args.id,revision:args.revision,payload},claims);
  }catch(error){if(uploads.length)await storage.remove('salah-curated',uploads).catch(()=>{});throw error;}
 };
}
