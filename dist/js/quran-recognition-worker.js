import{acousticLandmarks,matchAcousticLandmarks}from './quran-recognition-core.js';
let catalog=null,pairs=null;
self.onmessage=e=>{const {id,type}=e.data||{};try{
 if(type==='index'){catalog=e.data.catalog;pairs=new Uint32Array(e.data.bytes);self.postMessage({id,type:'ready'});return;}
 if(type==='match'){if(!catalog||!pairs)throw Error('База не загружена');const landmarks=acousticLandmarks(new Float32Array(e.data.samples));self.postMessage({id,type:'result',result:matchAcousticLandmarks(landmarks,pairs,catalog.tracks)});}
}catch{self.postMessage({id,type:'error'});}};
