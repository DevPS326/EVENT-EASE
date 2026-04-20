export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

export const formatEventDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatEventTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

export const formatCurrency = (amount) =>
  amount === 0 ? 'Free' : `₹${Number(amount).toLocaleString('en-IN')}`;
