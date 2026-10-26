// A completed round needs a new deliberate tap before voluntary repetitions.
export function createDhikrCompletionGate({now=Date.now,hold=1100,afterUnlock=400}={}){
 let day=null,complete=false,extra=false,until=0;
 function sync(value){if(day!==value.day||value.count<value.target){day=value.day;complete=false;extra=false;until=0;}if(value.count>=value.target&&!complete){complete=true;until=now()+hold;}return{extra,remaining:Math.max(0,until-now()),complete};}
 return{sync,action(value){const state=sync(value);if(state.remaining)return 'wait';if(!state.complete)return 'prescribed';if(!extra){extra=true;until=now()+afterUnlock;return 'unlock';}return 'extra';}};
}
