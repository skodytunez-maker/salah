export function createHomeworkStorage(client){
 const bucket=()=>{if(!client)throw Error('Private homework storage unavailable');return client.storage.from('salah-homework-private');};
 return{
  async signUpload(path){const{data,error}=await bucket().createSignedUploadUrl(path,{upsert:false});if(error||!data?.signedUrl)throw Error('Upload unavailable');return data.signedUrl;},
  async signRead(path,seconds){const{data,error}=await bucket().createSignedUrl(path,seconds);if(error||!data?.signedUrl)throw Error('File unavailable');return data.signedUrl;},
  async download(path){const{data,error}=await bucket().download(path);if(error||!data||data.size>6291456)throw Error('Upload incomplete');return new Uint8Array(await data.arrayBuffer());},
  async remove(path){const{error}=await bucket().remove([path]);if(error)throw Error('Remove unavailable');}
 };
}
