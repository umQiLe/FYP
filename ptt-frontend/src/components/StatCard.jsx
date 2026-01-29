import React from "react";
// Example icons, e.g., from heroicons

/**
 * StatCard Component.
 *
 * Displays a statistic with a title, value, percentage change indicator,
 * and additional descriptive text.
 *
 * @param {string} title - The title of the statistic (e.g., "Total Users").
 * @param {string|number} value - The main value to display (e.g., "1,234").
 * @param {string} percentageChange - The change string (e.g., "+5%", "-2%").
 *                                    Prefix with "+" for positive (green) and "-" for negative (red).
 * @param {string} description - Primary descriptive text below the value.
 * @param {string} subDescription - Secondary, smaller descriptive text.
 */
const StatCard = ({
  title,
  value,
  percentageChange,
  description,
  subDescription,
}) => {
  const isPositive = percentageChange.startsWith("+");
  const isNegative = percentageChange.startsWith("-");

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      {/* Header: Title and Percentage Badge */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span
          className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? "bg-green-100 text-green-700" : ""
            } ${isNegative ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
            }`}
        >

          {percentageChange}
        </span>
      </div>

      {/* Main Value */}
      <h2 className="text-3xl font-bold text-gray-900">{value}</h2>

      {/* Footer: Descriptions */}
      <div className="mt-4">
        <p className="text-sm text-gray-800 flex items-center">
          {description}

        </p>
        <p className="text-xs text-gray-400 mt-1">{subDescription}</p>
      </div>
    </div>
  );
};

export default StatCard;