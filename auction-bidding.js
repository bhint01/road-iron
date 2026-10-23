// Road Iron Auctions browser bidding adapter — NOT wired to production.
// Supabase client must be initialized with the existing Road Iron project.
// Never accept bidder_id from the browser: auction_place_bid derives auth.uid().
// Keep featureEnabled=false until SQL/RLS, settlement and integration tests pass.
export function createAuctionBidClient(supabase, {featureEnabled = false} = {}) {
  if (!supabase?.auth || !supabase?.rpc) throw new TypeError('Supabase client required');
  return {
    async currentUser() {
      const {data, error} = await supabase.auth.getUser();
      if (error) throw new Error('Unable to verify account');
      return data?.user ?? null;
    },
    async placeBid({lotId, amount, requestKey}) {
      if (!featureEnabled) throw new Error('Auction bidding is not enabled');
      const {data: userData, error: authError} = await supabase.auth.getUser();
      if (authError || !userData?.user?.id) throw new Error('Please sign in to bid');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lotId || ''))
        throw new Error('Invalid auction ID');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey || ''))
        throw new Error('Invalid bid request ID');
      const bid = Number(amount);
      if (!Number.isFinite(bid) || bid <= 0 || !Number.isSafeInteger(Math.round(bid * 100)) ||
          Math.abs(bid * 100 - Math.round(bid * 100)) > 1e-7)
        throw new Error('Enter a valid bid amount in dollars and cents');
      const {data,error} = await supabase.rpc('auction_place_bid',{
        p_lot_id:lotId,p_amount:(Math.round(bid*100)/100).toFixed(2),p_request_key:requestKey
      });
      if (error) throw new Error(error.message || 'Bid could not be accepted');
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.bid_id) throw new Error('Bid confirmation missing; check bid history before retrying');
      return result;
    }
  };
}
