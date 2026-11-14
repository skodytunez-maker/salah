// Only the city explicitly selected in SALAH; never device location or coordinates.
export function guestSelectedContext(city){
 const clean=value=>typeof value==='string'&&value.length<=160&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim().replace(/\s+/g,' '):null;
 const name=clean(city?.name);if(!name)return null;
 return{city:name,country:clean(city?.country)||null};
}
