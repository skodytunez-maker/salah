// Real display helpers for legacy VM tests which deliberately strip imports.
import*as language from '../../dist/js/i18n.js';
import{uiLeaf,uiAttribute,uiTextAttributes,setUiMessage,uiMessage,uiError}from '../../dist/js/ui.js';
import{rankingTime,listeningTime,renderRankingTimes,rankingErrorMessage,rankingModal}from '../../dist/js/ranking-ui.js';
import{translateListeningSummary}from '../../dist/js/listening-summary.js';
export function rankingUiContext(values){
 const context={...language,uiLeaf,uiAttribute,uiTextAttributes,setUiMessage,uiMessage,uiError,rankingTime,listeningTime,renderRankingTimes,rankingErrorMessage,translateListeningSummary,...values};
 context.rankingModal=(...args)=>typeof context.modal==='function'?context.modal(...args):rankingModal(...args);
 return context;
}
