// A dedicated launch page makes the owner login discoverable in the installed
// cabinet. It grants no role: owner-auth still verifies every session remotely.
if(!location.hash)location.replace(location.pathname+location.search+'#admin');
