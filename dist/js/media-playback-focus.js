// One explicit foreground recording at a time. No listening history is stored.
const clients=new Map();let current=null;
export function registerPlayback(owner,pause){clients.set(owner,pause);return()=>{clients.delete(owner);if(current===owner)current=null;};}
export function claimPlayback(owner){if(current===owner)return;current=owner;for(const [other,pause]of clients)if(other!==owner)pause();}
