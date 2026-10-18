// Only the selected viewport is requested; no map prefetch or offline tile download.
export const MAP_ATTRIBUTION='<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
export const MAP_PLACES={mecca:{name:'Мекка · Кааба',latitude:21.422487,longitude:39.826206},medina:{name:'Медина · мечеть Пророка',latitude:24.4673,longitude:39.6112}};
export function mapStyle(mode){
 if(mode==='map')return 'https://tiles.openfreemap.org/styles/liberty';
 const satellite=mode==='satellite';return{version:8,sources:{basemap:{type:'raster',tiles:[satellite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:satellite?19:17,attribution:satellite?'Tiles © Esri · Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community':'Map data © OpenStreetMap contributors, SRTM · Map style © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)'},openmaptiles:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:MAP_ATTRIBUTION}},layers:[{id:'basemap',type:'raster',source:'basemap'}]};
}
export function styleSalahMap(map,mode,threeD){
 const layers=map.getStyle().layers||[];
 if(mode==='map')for(const layer of layers){const id=layer.id.toLowerCase();if(layer.type==='background')map.setPaintProperty(layer.id,'background-color','#0d1629');if(layer.type==='raster')map.setLayoutProperty(layer.id,'visibility','none');
 if(layer.type==='fill'){if(layer['source-layer']==='building')map.setLayoutProperty(layer.id,'visibility',threeD?'none':'visible');map.setPaintProperty(layer.id,'fill-color',/water/.test(id)?'#122b40':/park|wood|forest|grass/.test(id)?'#203b38':/building/.test(id)?'#34435b':'#18243a');if(layer.paint?.['fill-outline-color'])map.setPaintProperty(layer.id,'fill-outline-color','#46516a');}
 if(layer.type==='line')map.setPaintProperty(layer.id,'line-color',/water/.test(id)?'#2b4b63':/motorway|trunk|primary/.test(id)?'#82755f':/boundary/.test(id)?'#6b6d83':'#3c4b63');
 if(layer.type==='symbol'&&layer.layout?.['text-field']){map.setPaintProperty(layer.id,'text-color',/place|city|country/.test(id)?'#e0c994':'#c2cada');map.setPaintProperty(layer.id,'text-halo-color','#101a2c');map.setPaintProperty(layer.id,'text-halo-width',1.5);}
 if(layer.type==='fill-extrusion')map.setLayoutProperty(layer.id,'visibility','none');}
 if(map.getSource('openmaptiles')&&!map.getLayer('salah-buildings'))map.addLayer({id:'salah-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':mode==='satellite'?'#b6af9f':'#35465f','fill-extrusion-height':['coalesce',['get','render_height'],6],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1},layout:{visibility:threeD?'visible':'none'}});
 else if(map.getLayer('salah-buildings'))map.setLayoutProperty('salah-buildings','visibility',threeD?'visible':'none');
}
