import { formatDistanceToNow } from 'date-fns';

export function formatDate(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (e) {
    return 'some time ago';
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}
