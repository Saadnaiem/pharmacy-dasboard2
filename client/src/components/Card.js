import React from 'react';

const Card = ({ title, value }) => {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
  );
};

export default Card;
