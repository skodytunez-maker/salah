// Shared by the web timetable and the background reminder service.
export const TYUMEN_SOURCES=['auto','calendar','al-hakk'];
export function normalizeTyumenSource(value){return TYUMEN_SOURCES.includes(value)?value:'auto'}
export function tyumenSourceFiles(value){
 const source=normalizeTyumenSource(value);
 const calendar=['tyumen-october-2026.json','tyumen-november-2026.json'];
 return source==='calendar'?calendar:source==='al-hakk'?['al-hakk-tyumen.json']:['al-hakk-tyumen.json',...calendar];
}
export function matchesTyumenSource(value,row){
 const source=normalizeTyumenSource(value);
 return source==='auto'||row?.source===(source==='calendar'?'tyumen-table':'al-hakk');
}
