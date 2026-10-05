// Shared by the web timetable and the background reminder service.
export const TYUMEN_SOURCES=['auto','calendar','al-hakk'];
export function normalizeTyumenSource(value){return TYUMEN_SOURCES.includes(value)?value:'auto'}
export function tyumenSourceFiles(value){
 const source=normalizeTyumenSource(value);
 return source==='calendar'?['tyumen-october-2026.json']:source==='al-hakk'?['al-hakk-tyumen.json']:['al-hakk-tyumen.json','tyumen-october-2026.json'];
}
export function matchesTyumenSource(value,row){
 const source=normalizeTyumenSource(value);
 return source==='auto'||row?.source===(source==='calendar'?'tyumen-table':'al-hakk');
}
