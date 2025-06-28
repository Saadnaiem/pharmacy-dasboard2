import React from 'react';

/**
 * Currency component with official Saudi Riyal symbol from SAMA
 */
const CurrencyDisplay = ({ value, className = '' }) => {
  if (!value && value !== 0) {
    return (
      <span className={`currency-display ${className}`}>
        0<span className="riyal-symbol"></span>
      </span>
    );
  }

  const num = Math.abs(value);
  let formattedValue;

  if (num >= 1000000) {
    formattedValue = (value / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    formattedValue = (value / 1000).toFixed(1) + 'K';
  } else {
    formattedValue = value.toFixed(0);
  }

  return (
    <span className={`currency-display ${className}`}>
      {formattedValue}<span className="riyal-symbol"></span>
    </span>
  );
};

export default CurrencyDisplay;
