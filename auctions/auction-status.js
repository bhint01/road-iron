export function describeOutcome(record) {
  const labels = {
    reserve_not_met: 'Reserve not met · no winner',
    no_bids: 'No bids · no winner',
    awaiting_result: 'Auction ended · result is being recorded',
    active: 'Open for bidding', scheduled: 'Scheduled', draft: 'Draft', cancelled: 'Cancelled'
  };
  if (record.outcome === 'winner_selected') {
    if (record.is_winner) return 'You have the winning bid · check My Bids for payment status';
    if (record.participation === 'bidder') return 'Auction ended · another bidder won';
    return 'Winner selected';
  }
  return labels[record.outcome] || 'Result unavailable';
}

