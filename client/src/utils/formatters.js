/**
 * Utility functions for formatting values in the Pharmacy Dashboard
 */

/**
 * Format currency values with Saudi Riyal symbol
 * @param {number} value - The currency value to format
 * @returns {string} Formatted currency string with ﷼ symbol
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '0 ﷼';
  const num = Math.abs(value);
  
  if (num >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M ﷼';
  } else if (num >= 1000) {
    return (value / 1000).toFixed(1) + 'K ﷼';
  } else {
    return value.toLocaleString('ar-SA', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }) + ' ﷼';
  }
};

/**
 * Format numbers with proper thousands separators
 * @param {number} value - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (!value && value !== 0) return '0';
  return value.toLocaleString('ar-SA');
};

/**
 * Format percentage values
 * @param {number} value - The percentage value (as decimal, e.g., 0.15 for 15%)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return (value * 100).toFixed(1) + '%';
};

/**
 * Format currency with full precision (no abbreviation)
 * @param {number} value - The currency value to format
 * @returns {string} Formatted currency string with full precision
 */
export const formatCurrencyFull = (value) => {
  if (!value && value !== 0) return '0.00 ﷼';
  return value.toLocaleString('ar-SA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' ﷼';
};

/**
 * Format date for display
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
