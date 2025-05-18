import { formatDistanceToNow, parseISO } from 'date-fns';

export function useDateFormatter() {
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return 'N/A';
    }
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to a simple date string if parsing or formatting fails
      try {
        return new Date(dateString).toLocaleDateString();
      } catch (e) {
        return 'Invalid Date';
      }
    }
  };

  return {
    formatRelativeTime,
  };
}