// Native links handle administration navigation, including when this helper is unavailable.
(function(){
 window.roadIronAuctions={async signOut(){
  const {db}=await import('./auctions/supabase-client.js');
  const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;
 }};
 // Preserve existing bookmarks to the Auctions section.
 if(location.hash==='#auctions')location.replace('/admin-auctions/index.html?v=live-status-20261027');
})();
