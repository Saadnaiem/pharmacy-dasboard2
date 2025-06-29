import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import ReportsPage from './ReportsPage';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Multi-Select Component
function MultiSelect({ options, values, onChange, placeholder, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);  const handleToggleOption = (optionValue) => {
    if (optionValue === 'all') {
      onChange(['all']);
    } else {
      let newValues = [...values.filter(v => v !== 'all')];
      if (newValues.includes(optionValue)) {
        newValues = newValues.filter(v => v !== optionValue);
      } else {
        newValues.push(optionValue);
      }
      onChange(newValues.length === 0 ? ['all'] : newValues);
    }
    // Don't close dropdown immediately to allow multiple selections
  };

  const getDisplayText = () => {
    if (values.includes('all') || values.length === 0) {
      return placeholder;
    }
    if (values.length === 1) {
      const option = options.find(opt => opt.value === values[0]);
      return option ? option.label : values[0];
    }
    return `${values.length} selected`;
  };

  return (
    <div className="multi-select" ref={dropdownRef}>
      <div className="multi-select-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="multi-select-text">{getDisplayText()}</span>
        <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="multi-select-dropdown">
          {options.map(option => (
            <div
              key={option.value}
              className={`multi-select-option ${
                values.includes(option.value) ? 'selected' : ''
              } ${option.value === 'all' ? 'all-option' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleOption(option.value);
              }}
            >
              <span className="multi-select-checkbox">
                {values.includes(option.value) ? '✓' : ''}
              </span>
              <span className="multi-select-label">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYears, setSelectedYears] = useState(['all']);
  const [selectedMonths, setSelectedMonths] = useState(['all']);
  const [selectedLocations, setSelectedLocations] = useState(['all']);
  const [page, setPage] = useState('dashboard');

  // Remove data source button and set up environment-based data loading
  const isProduction = process.env.NODE_ENV === 'production';
  const dataSourceUrl = '/api/sales-data'; // Use same endpoint for both dev and prod

  const loadSalesData = () => {
    console.log('Starting to load sales data from:', dataSourceUrl);
    setLoading(true);
    setError(null);
    
    axios.get(dataSourceUrl)
      .then(response => {
        console.log('Sales data loaded successfully:', response.data?.length, 'rows');
        console.log('Sample data:', response.data?.slice(0, 2));
        setSalesData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading sales data:', error);
        console.error('Error details:', error.response?.data || error.message);
        setError(`Failed to load sales data: ${error.response?.data?.error || error.message}`);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSalesData();
  }, []); // Remove loadSalesData from dependency array to avoid infinite loops

  // Calculate key metrics from the reference dashboard
  const calculateMetrics = (yearFilters = ['all'], monthFilters = ['all'], locationFilters = ['all']) => {
    if (!salesData || salesData.length === 0) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        topPharmacists: [],
        monthlyTrends: [],
        monthlyComparison: { months: [], data2024: [], data2025: [], transactions2024: [], transactions2025: [] },
        revenueByLocation: [],
        paymentMethods: { cash: 0, credit: 0 },
        yearComparison: { year2024: {}, year2025: {}, pharmacistComparison: [] },
      };
    }    // Apply filters
    let filteredData = salesData.filter(item => 
      item.NetRevenueAmount !== null && 
      !isNaN(Number(item.NetRevenueAmount))
    );

    // Apply year filter
    if (!yearFilters.includes('all')) {
      filteredData = filteredData.filter(item => 
        yearFilters.includes(item.Year.toString())
      );
    }

    // Apply month filter
    if (!monthFilters.includes('all')) {
      filteredData = filteredData.filter(item => 
        monthFilters.includes(item.Month.toString())
      );
    }

    // Apply location filter
    if (!locationFilters.includes('all')) {
      filteredData = filteredData.filter(item => 
        locationFilters.includes(item.LOCATIONNAME)
      );
    }    // Special case: When year is "all" and month(s) are specified, calculate year comparison
    let yearComparison = { year2024: {}, year2025: {}, pharmacistComparison: [] };
    if (yearFilters.includes('all') && !monthFilters.includes('all')) {
      // Get 2024 data for the selected months
      const data2024 = salesData.filter(item => 
        item.Year === 2024 && 
        monthFilters.includes(item.Month.toString()) &&
        item.NetRevenueAmount !== null && 
        !isNaN(Number(item.NetRevenueAmount)) &&
        (locationFilters.includes('all') || locationFilters.includes(item.LOCATIONNAME))
      );
      
      // Get 2025 data for the selected months
      const data2025 = salesData.filter(item => 
        item.Year === 2025 && 
        monthFilters.includes(item.Month.toString()) &&
        item.NetRevenueAmount !== null && 
        !isNaN(Number(item.NetRevenueAmount)) &&
        (locationFilters.includes('all') || locationFilters.includes(item.LOCATIONNAME))
      );

      // Helper function to calculate top days with net values from backend
      const calculateTopDays = (data) => {
        const dailyStats = data.reduce((acc, item) => {
          const date = new Date(item.Date);
          const dateKey = date.toDateString();
          
          if (!acc[dateKey]) {
            acc[dateKey] = {
              dateString: dateKey,
              dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
              dateFormatted: date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }),
              revenue: 0,
              grossSales: 0,
              returns: 0,
              transactions: 0,
              salesTransactions: 0,
              returnTransactions: 0
            };
          }
          
          const amount = Number(item.NetRevenueAmount);
          
          // Backend already processed returns (negative amounts are returns)
          if (amount < 0) {
            // This is a return transaction (already negated by backend)
            acc[dateKey].returns += Math.abs(amount);
            acc[dateKey].returnTransactions += 1;
          } else {
            // This is a regular sale transaction
            acc[dateKey].grossSales += amount;
            acc[dateKey].salesTransactions += 1;
          }
          
          // Total revenue is net (includes negative returns and positive sales)
          acc[dateKey].revenue += amount;
          
          // Count all transactions (sales + returns)
          acc[dateKey].transactions += 1;
          return acc;
        }, {});

        const topDaySales = Object.values(dailyStats).reduce((max, day) => 
          day.revenue > max.revenue ? day : max,
          { revenue: 0, dayName: 'N/A', dateFormatted: 'N/A' }
        );

        const topDayTransactions = Object.values(dailyStats).reduce((max, day) => 
          day.transactions > max.transactions ? day : max,
          { transactions: 0, dayName: 'N/A', dateFormatted: 'N/A' }
        );

        return { topDaySales, topDayTransactions };
      };

      // Calculate top days for 2024
      const topDays2024 = calculateTopDays(data2024);
      
      // Calculate top days for 2025
      const topDays2025 = calculateTopDays(data2025);      yearComparison.year2024 = {
        totalRevenue: data2024.reduce((sum, item) => {
          const amount = Number(item.NetRevenueAmount);
          return sum + amount; // Backend already processed returns
        }, 0),
        totalTransactions: data2024.filter(item => {
          const amount = Number(item.NetRevenueAmount);
          return amount >= 0; // Count only positive amounts (sales)
        }).length,
        averageOrderValue: (() => {
          const salesTransactions = data2024.filter(item => {
            const amount = Number(item.NetRevenueAmount);
            return amount >= 0; // Only positive amounts (sales)
          });
          const totalSalesRevenue = salesTransactions.reduce((sum, item) => sum + Number(item.NetRevenueAmount), 0);
          return salesTransactions.length > 0 ? totalSalesRevenue / salesTransactions.length : 0;
        })(),
        uniqueDays: new Set(data2024.map(item => new Date(item.Date).toDateString())).size,
        averageDailyRevenue: (() => {
          const revenue = data2024.reduce((sum, item) => {
            const amount = Number(item.NetRevenueAmount);
            return sum + amount; // Backend already processed returns
          }, 0);
          const days = new Set(data2024.map(item => new Date(item.Date).toDateString())).size;
          return days > 0 ? revenue / days : 0;
        })(),
        averageDailyTransactions: (() => {
          const days = new Set(data2024.map(item => new Date(item.Date).toDateString())).size;
          // Count only positive transactions (sales), since backend already processed returns
          const salesTransactions = data2024.filter(item => {
            const amount = Number(item.NetRevenueAmount);
            return amount > 0; // Only count positive transactions (sales)
          }).length;
          return days > 0 ? salesTransactions / days : 0;
        })(),
        activePharmacists: new Set(
          data2024
            .map(item => formatPharmacistName(item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown'))
            .filter(pharmacist => pharmacist && pharmacist !== 'Unknown')
        ).size,
        returnsMetrics: (() => {
          const returnsData = data2024.reduce((acc, item) => {
            const amount = Number(item.NetRevenueAmount);
            
            // Backend already processed returns (negative amounts are returns)
            if (amount < 0) {
              acc.totalReturns += Math.abs(amount);
              acc.returnTransactions += 1;
            } else {
              acc.grossSales += amount;
              acc.salesTransactions += 1;
            }
            return acc;
          }, { totalReturns: 0, returnTransactions: 0, grossSales: 0, salesTransactions: 0 });
          
          return returnsData;
        })(),
        paymentMethods: data2024.reduce((acc, item) => {
          const amount = Number(item.NetRevenueAmount);
          const cashAmount = Number(item.CASHREVENUE || 0);
          const creditAmount = Number(item.CREDITREVENUE || 0);
          
          // Backend already processed returns, so we use amounts directly
          acc.cash += cashAmount;
          acc.credit += creditAmount;
          
          return acc;
        }, { cash: 0, credit: 0 }),
        pharmacistStats: data2024.reduce((acc, item) => {
          const fullName = item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown';
          const pharmacist = formatPharmacistName(fullName);
          const amount = Number(item.NetRevenueAmount);
          
          if (!acc[pharmacist]) acc[pharmacist] = 0;
          
          // Backend already processed returns, so we use amounts directly
          acc[pharmacist] += amount;
          
          return acc;
        }, {}),
        topDaySales: topDays2024.topDaySales,
        topDayTransactions: topDays2024.topDayTransactions
      };      yearComparison.year2025 = {
        totalRevenue: data2025.reduce((sum, item) => {
          const amount = Number(item.NetRevenueAmount);
          return sum + amount; // Backend already processed returns
        }, 0),
        totalTransactions: data2025.filter(item => {
          const amount = Number(item.NetRevenueAmount);
          return amount > 0; // Only count positive transactions (sales)
        }).length,
        averageOrderValue: (() => {
          const salesTransactions = data2025.filter(item => {
            const amount = Number(item.NetRevenueAmount);
            return amount > 0; // Only count positive transactions (sales)
          });
          const totalSalesRevenue = salesTransactions.reduce((sum, item) => sum + Number(item.NetRevenueAmount), 0);
          return salesTransactions.length > 0 ? totalSalesRevenue / salesTransactions.length : 0;
        })(),
        uniqueDays: new Set(data2025.map(item => new Date(item.Date).toDateString())).size,
        averageDailyRevenue: (() => {
          const revenue = data2025.reduce((sum, item) => {
            const amount = Number(item.NetRevenueAmount);
            return sum + amount; // Backend already processed returns
          }, 0);
          const days = new Set(data2025.map(item => new Date(item.Date).toDateString())).size;
          return days > 0 ? revenue / days : 0;
        })(),
        averageDailyTransactions: (() => {
          const days = new Set(data2025.map(item => new Date(item.Date).toDateString())).size;
          // Count only positive transactions (sales), since backend already processed returns
          const salesTransactions = data2025.filter(item => {
            const amount = Number(item.NetRevenueAmount);
            return amount > 0; // Only count positive transactions (sales)
          }).length;
          return days > 0 ? salesTransactions / days : 0;
        })(),
        activePharmacists: new Set(
          data2025
            .map(item => formatPharmacistName(item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown'))
            .filter(pharmacist => pharmacist && pharmacist !== 'Unknown')
        ).size,
        returnsMetrics: (() => {
          const returnsData = data2025.reduce((acc, item) => {
            const amount = Number(item.NetRevenueAmount);
            
            // Backend already processed returns (negative amounts are returns)
            if (amount < 0) {
              acc.totalReturns += Math.abs(amount);
              acc.returnTransactions += 1;
            } else {
              acc.grossSales += amount;
              acc.salesTransactions += 1;
            }
            return acc;
          }, { totalReturns: 0, returnTransactions: 0, grossSales: 0, salesTransactions: 0 });
          
          return returnsData;
        })(),
        paymentMethods: data2025.reduce((acc, item) => {
          const amount = Number(item.NetRevenueAmount);
          const cashAmount = Number(item.CASHREVENUE || 0);
          const creditAmount = Number(item.CREDITREVENUE || 0);
          
          // Backend already processed returns, so we use amounts directly
          acc.cash += cashAmount;
          acc.credit += creditAmount;
          
          return acc;
        }, { cash: 0, credit: 0 }),
        pharmacistStats: data2025.reduce((acc, item) => {
          const fullName = item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown';
          const pharmacist = formatPharmacistName(fullName);
          const amount = Number(item.NetRevenueAmount);
          
          if (!acc[pharmacist]) acc[pharmacist] = 0;
          
          // Backend already processed returns, so we use amounts directly
          acc[pharmacist] += amount;
          
          return acc;
        }, {}),
        topDaySales: topDays2025.topDaySales,
        topDayTransactions: topDays2025.topDayTransactions
      };

      // Create pharmacist comparison for year-over-year analysis
      const allPharmacists = new Set([
        ...Object.keys(yearComparison.year2024.pharmacistStats || {}),
        ...Object.keys(yearComparison.year2025.pharmacistStats || {})
      ]);

      yearComparison.pharmacistComparison = Array.from(allPharmacists).map(pharmacist => {
        const revenue2024 = yearComparison.year2024.pharmacistStats[pharmacist] || 0;
        const revenue2025 = yearComparison.year2025.pharmacistStats[pharmacist] || 0;
        const growth = revenue2025 - revenue2024;
        const growthRate = revenue2024 > 0 ? ((growth / revenue2024) * 100) : (revenue2025 > 0 ? 100 : 0);

        return {
          name: pharmacist,
          revenue2024,
          revenue2025,
          growth,
          growthRate
        };
      }).sort((a, b) => (b.revenue2024 + b.revenue2025) - (a.revenue2024 + a.revenue2025));
    }    const validData = filteredData;

    // Total metrics with returns already handled by backend
    const revenueMetrics = validData.reduce((acc, item) => {
      const amount = Number(item.NetRevenueAmount);
      // Backend already processed returns, so we just use the net amounts directly
      
      if (amount < 0) {
        // This is a return transaction (already negated by backend)
        acc.totalReturns += Math.abs(amount);
        acc.returnTransactions += 1;
      } else {
        // This is a regular sale transaction
        acc.grossSales += amount;
        acc.salesTransactions += 1;
      }
      
      acc.totalRevenue += amount; // This is already net (returns subtracted)
      acc.totalTransactions += 1;
      return acc;
    }, {
      totalRevenue: 0,
      grossSales: 0,
      totalReturns: 0,
      totalTransactions: 0,
      salesTransactions: 0,
      returnTransactions: 0
    });

    const totalRevenue = revenueMetrics.totalRevenue;
    const totalTransactions = revenueMetrics.salesTransactions; // Use sales transactions only (net transactions)
    const averageOrderValue = revenueMetrics.salesTransactions > 0 ? revenueMetrics.grossSales / revenueMetrics.salesTransactions : 0;
    
    // Calculate unique days for average daily revenue
    const uniqueDays = new Set(
      validData.map(item => {
        // Create a date string from the item's date
        const date = new Date(item.Date);
        return date.toDateString(); // This will give us unique days
      })
    ).size;
    
    const averageDailyRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
    
    // Calculate average daily transactions (net sales transactions only)
    const averageDailyTransactions = uniqueDays > 0 ? totalTransactions / uniqueDays : 0;

    // Top Pharmacists - use net values (returns already processed by backend)
    const pharmacistStats = validData.reduce((acc, item) => {
      // Try multiple possible name fields
      const fullName = item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown';
      const pharmacist = formatPharmacistName(fullName);
      const amount = Number(item.NetRevenueAmount);
      
      if (!acc[pharmacist]) acc[pharmacist] = 0;
      // Backend already processed returns, so we just add the net amounts
      acc[pharmacist] += amount;
      
      return acc;
    }, {});
    
    const topPharmacists = Object.entries(pharmacistStats)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Debug: Check first 3 entries
    console.log('Top 3 Pharmacists:', topPharmacists.slice(0, 3).map((p, i) => ({
      position: i + 1,
      name: p.name,
      revenue: p.revenue,
      formatted: formatCurrency(p.revenue)
    })));    // Monthly trends - adapted for multiple filters
    let monthlyComparison;
    
    // Calculate monthly stats by year once - use net values (returns already processed by backend)
    const monthlyStatsByYear = validData.reduce((acc, item) => {
      const year = item.Year;
      const month = item.Month;
      const amount = Number(item.NetRevenueAmount);
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = { revenue: 0, transactions: 0 };
      
      // Backend already processed returns, so we just add the net amounts
      acc[year][month].revenue += amount;
      // Count all transactions (both positive and negative)
      acc[year][month].transactions += 1;
      
      return acc;
    }, {});
    
    if (!yearFilters.includes('all') && !monthFilters.includes('all')) {
      // Specific years and months selected - use net values (returns already processed by backend)
      const totalRevenue = validData.reduce((sum, item) => {
        const amount = Number(item.NetRevenueAmount);
        return sum + amount; // Backend already processed returns
      }, 0);
      const totalTransactions = validData.length;
      
      monthlyComparison = {
        months: ['Selected Period'],
        data2024: yearFilters.includes('2024') ? [totalRevenue] : [0],
        data2025: yearFilters.includes('2025') ? [totalRevenue] : [0],
        transactions2024: yearFilters.includes('2024') ? [totalTransactions] : [0],
        transactions2025: yearFilters.includes('2025') ? [totalTransactions] : [0]
      };
    } else if (!yearFilters.includes('all')) {
      // Specific years selected - show monthly breakdown
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthlyComparison = {
        months: months,
        data2024: yearFilters.includes('2024') ? months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1]?.revenue || 0) : [],
        data2025: yearFilters.includes('2025') ? months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1]?.revenue || 0) : [],
        transactions2024: yearFilters.includes('2024') ? months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1]?.transactions || 0) : [],
        transactions2025: yearFilters.includes('2025') ? months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1]?.transactions || 0) : []
      };
    } else if (!monthFilters.includes('all')) {
      // Specific months selected - show year comparison
      if (monthFilters.length === 1) {
        // Single month - show year comparison
        monthlyComparison = {
          months: ['2024', '2025'],
          data2024: [monthlyStatsByYear[2024]?.[parseInt(monthFilters[0])]?.revenue || 0, 0],
          data2025: [0, monthlyStatsByYear[2025]?.[parseInt(monthFilters[0])]?.revenue || 0],
          transactions2024: [monthlyStatsByYear[2024]?.[parseInt(monthFilters[0])]?.transactions || 0, 0],
          transactions2025: [0, monthlyStatsByYear[2025]?.[parseInt(monthFilters[0])]?.transactions || 0]
        };
      } else {
        // Multiple months - show selected months comparison
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const selectedMonthNames = monthFilters.map(m => monthNames[parseInt(m)]);
        monthlyComparison = {
          months: selectedMonthNames,
          data2024: monthFilters.map(m => monthlyStatsByYear[2024]?.[parseInt(m)]?.revenue || 0),
          data2025: monthFilters.map(m => monthlyStatsByYear[2025]?.[parseInt(m)]?.revenue || 0),
          transactions2024: monthFilters.map(m => monthlyStatsByYear[2024]?.[parseInt(m)]?.transactions || 0),
          transactions2025: monthFilters.map(m => monthlyStatsByYear[2025]?.[parseInt(m)]?.transactions || 0)
        };
      }
    } else {
      // No filters or all selected - show complete year comparison
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyComparison = {
        months: months,
        data2024: months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1]?.revenue || 0),
        data2025: months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1]?.revenue || 0),
        transactions2024: months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1]?.transactions || 0),
        transactions2025: months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1]?.transactions || 0)
      };
    }

    // Keep original monthly trends for backward compatibility - use net values (returns already processed by backend)
    const monthlyStats = validData.reduce((acc, item) => {
      const monthKey = `${item.Year}-${item.Month.toString().padStart(2, '0')}`;
      const amount = Number(item.NetRevenueAmount);
      
      if (!acc[monthKey]) acc[monthKey] = 0;
      // Backend already processed returns, so we just add the net amounts
      acc[monthKey] += amount;
      
      return acc;
    }, {});

    const monthlyTrends = Object.entries(monthlyStats)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue by Location - use net values (returns already processed by backend)
    const locationStats = validData.reduce((acc, item) => {
      const location = item.LOCATIONNAME || 'Unknown';
      const amount = Number(item.NetRevenueAmount);
      
      if (!acc[location]) acc[location] = 0;
      // Backend already processed returns, so we just add the net amounts
      acc[location] += amount;
      
      return acc;
    }, {});

    const revenueByLocation = Object.entries(locationStats)
      .map(([location, revenue]) => ({ location, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);    // Payment Methods - use net values (backend handles returns for revenue amounts)
    const paymentMethods = validData.reduce((acc, item) => {
      const cashAmount = Number(item.CASHREVENUE || 0);
      const creditAmount = Number(item.CREDITREVENUE || 0);
      
      // For payment methods, we need to check if this is a return based on NetRevenueAmount
      const netAmount = Number(item.NetRevenueAmount);
      
      if (netAmount < 0) {
        // This is a return transaction - subtract payment amounts
        acc.cash -= Math.abs(cashAmount);
        acc.credit -= Math.abs(creditAmount);
      } else {
        // Regular sale transaction - add payment amounts
        acc.cash += cashAmount;
        acc.credit += creditAmount;
      }
      
      return acc;
    }, { cash: 0, credit: 0 });    // Active Pharmacists Count - unique pharmacists in the filtered period
    const activePharmacists = new Set(
      validData
        .map(item => formatPharmacistName(item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown'))
        .filter(pharmacist => pharmacist && pharmacist !== 'Unknown')
    ).size;    // Calculate daily aggregations for top day metrics (use net values - returns already processed by backend)
    const dailyStats = validData.reduce((acc, item) => {
      const date = new Date(item.Date);
      const dateKey = date.toDateString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateString: dateKey,
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }), // "Monday"
          dateFormatted: date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }), // "Jan 1, 2024"
          revenue: 0,
          grossSales: 0,
          returns: 0,
          transactions: 0,
          salesTransactions: 0,
          returnTransactions: 0
        };
      }
      
      const amount = Number(item.NetRevenueAmount);
      
      // Backend already processed returns (negative amounts are returns)
      if (amount < 0) {
        // This is a return transaction (already negated by backend)
        acc[dateKey].returns += Math.abs(amount);
        acc[dateKey].returnTransactions += 1;
      } else {
        // This is a regular sale transaction
        acc[dateKey].grossSales += amount;
        acc[dateKey].salesTransactions += 1;
      }
      
      // Total revenue is net (includes negative returns and positive sales)
      acc[dateKey].revenue += amount;
      
      // Count all transactions (sales + returns)
      acc[dateKey].transactions += 1;
      
      return acc;
    }, {});

    // Find top day by sales (revenue)
    const topDaySales = Object.values(dailyStats).reduce((max, day) => 
      day.revenue > max.revenue ? day : max,
      { revenue: 0, dayName: 'N/A', dateFormatted: 'N/A' }
    );

    // Find top day by transactions
    const topDayTransactions = Object.values(dailyStats).reduce((max, day) => 
      day.transactions > max.transactions ? day : max,
      { transactions: 0, dayName: 'N/A', dateFormatted: 'N/A' }
    );    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      averageDailyRevenue,
      averageDailyTransactions,
      uniqueDays,
      activePharmacists,
      topPharmacists,
      monthlyTrends,
      monthlyComparison,
      revenueByLocation,
      paymentMethods,
      yearComparison,
      topDaySales,
      topDayTransactions,
      // Returns metrics
      grossSales: revenueMetrics.grossSales,
      totalReturns: revenueMetrics.totalReturns,
      salesTransactions: revenueMetrics.salesTransactions,
      returnTransactions: revenueMetrics.returnTransactions,
      netSalesRate: revenueMetrics.grossSales > 0 ? (revenueMetrics.totalRevenue / revenueMetrics.grossSales * 100) : 100,
    };
  };

  // Function to format pharmacist names to show only first and second names
  const formatPharmacistName = (fullName) => {
    if (!fullName || fullName === 'Unknown') return fullName;
    
    // Split the name by spaces and take only the first two parts
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    }
    return nameParts[0]; // If only one name part, return it
  };

  // Number formatting function for M/K notation
  const formatNumber = (value) => {
    if (!value) return '0';
    const num = Math.abs(value);
    
    if (num >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else {
      return value.toFixed(0);
    }
  };

  // Format currency with M/K notation
  const formatCurrency = (value) => {
    if (!value) return '0';
    const num = Math.abs(value);
    
    if (num >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else {
      return value.toFixed(0);
    }
  };
  // Generate dynamic chart title based on filters
  const getChartTitle = () => {
    const hasSpecificYears = !selectedYears.includes('all');
    const hasSpecificMonths = !selectedMonths.includes('all');
    
    if (hasSpecificYears && hasSpecificMonths) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      if (selectedYears.length === 1 && selectedMonths.length === 1) {
        return `Revenue Trend - ${monthNames[parseInt(selectedMonths[0])]} ${selectedYears[0]}`;
      } else {
        return `Revenue Trend - Multiple Periods Selected`;
      }
    } else if (hasSpecificYears) {
      return selectedYears.length === 1 ? `Monthly Revenue Trend - ${selectedYears[0]}` : `Monthly Revenue Trend - Multiple Years`;
    } else if (hasSpecificMonths) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      if (selectedMonths.length === 1) {
        return `Revenue Trend - ${monthNames[parseInt(selectedMonths[0])]} (All Years)`;
      } else {
        return `Revenue Trend - Multiple Months`;
      }
    } else {
      return 'Monthly Revenue Trend - 2024 vs 2025';
    }
  };

  // Generate dynamic chart title for transactions based on filters
  const getTransactionChartTitle = () => {
    const hasSpecificYears = !selectedYears.includes('all');
    const hasSpecificMonths = !selectedMonths.includes('all');
    
    if (hasSpecificYears && hasSpecificMonths) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      if (selectedYears.length === 1 && selectedMonths.length === 1) {
        return `Transaction Trend - ${monthNames[parseInt(selectedMonths[0])]} ${selectedYears[0]}`;
      } else {
        return `Transaction Trend - Multiple Periods Selected`;
      }
    } else if (hasSpecificYears) {
      return selectedYears.length === 1 ? `Monthly Transaction Trend - ${selectedYears[0]}` : `Monthly Transaction Trend - Multiple Years`;
    } else if (hasSpecificMonths) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      if (selectedMonths.length === 1) {
        return `Transaction Trend - ${monthNames[parseInt(selectedMonths[0])]} (All Years)`;
      } else {
        return `Transaction Trend - Multiple Months`;
      }
    } else {
      return 'Monthly Transaction Trend - 2024 vs 2025';
    }
  };

  // Get filter summary for display
  const getFilterSummary = () => {
    const hasSpecificYears = !selectedYears.includes('all');
    const hasSpecificMonths = !selectedMonths.includes('all');
    const hasSpecificLocations = !selectedLocations.includes('all');
    
    let parts = [];
    
    if (hasSpecificYears) {
      parts.push(selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} years`);
    }
    
    if (hasSpecificMonths) {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (selectedMonths.length === 1) {
        parts.push(monthNames[parseInt(selectedMonths[0])]);
      } else {
        parts.push(`${selectedMonths.length} months`);
      }
    }
    
    if (hasSpecificLocations) {
      parts.push(selectedLocations.length === 1 ? selectedLocations[0] : `${selectedLocations.length} locations`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'All Time';
  };

  // Get unique locations for filter dropdown
  const getUniqueLocations = () => {
    if (!salesData || salesData.length === 0) return [];
    const locations = [...new Set(salesData.map(item => item.LOCATIONNAME).filter(loc => loc))];
    return locations.sort();
  };
  const metrics = calculateMetrics(selectedYears, selectedMonths, selectedLocations);
  // Check if we should show year comparison (All Years + specific month(s))
  const shouldShowYearComparison = () => {
    return selectedYears.includes('all') && !selectedMonths.includes('all');
  };

  // Get month summary for year comparison
  const getMonthSummary = () => {
    if (selectedMonths.length === 1) {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(selectedMonths[0])]} Comparison`;
    } else {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const selectedMonthNames = selectedMonths.map(m => monthNames[parseInt(m)]).join(', ');
      return `${selectedMonthNames} Total`;
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading Pharmacy Analytics Dashboard</h2>
        <div className="loading-spinner"></div>
        <p>Processing sales data...</p>
        <div className="loading-footer">
          <p className="creator-credit">Created By Dr.Saad Naiem Ali™</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="container">
          <h1 className="main-title">
            💊 Pharmacy Analytics Dashboard
          </h1>
          <div className="error-state">
            <p>{error}</p>
          </div>
          <footer className="footer">
            <p>Created By Dr.Saad Naiem Ali</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <nav className="main-nav">
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
          <button className={page === 'reports' ? 'active' : ''} onClick={() => setPage('reports')}>Reports</button>
        </nav>
        {page === 'dashboard' ? (
          <>        
        <h1 className="main-title">
          💊 Pharmacy Analytics Dashboard
        </h1>
        
        {/* Filter Instructions */}
        <div className="filter-instructions">
          <p>
            <span className="highlight">Multi-Select Filters:</span> Click to select multiple years, months, or locations for advanced analysis
          </p>
        </div>
        
        {/* Filter Controls */}
        <div className="filters">          <div className="filter-select">
            <MultiSelect
              options={[
                { value: 'all', label: 'All Years' },
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' }
              ]}
              values={selectedYears}
              onChange={setSelectedYears}
              placeholder="All Years"
              label="Year Filter"
            />
          </div>
          <div className="filter-select">
            <MultiSelect
              options={[
                { value: 'all', label: 'All Months' },
                { value: '1', label: 'January' },
                { value: '2', label: 'February' },
                { value: '3', label: 'March' },
                { value: '4', label: 'April' },
                { value: '5', label: 'May' },
                { value: '6', label: 'June' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
                { value: '9', label: 'September' },
                { value: '10', label: 'October' },
                { value: '11', label: 'November' },
                { value: '12', label: 'December' }
              ]}
              values={selectedMonths}
              onChange={setSelectedMonths}
              placeholder="All Months"
              label="Month Filter"
            />
          </div>
          <div className="filter-select">
            <MultiSelect
              options={[
                { value: 'all', label: 'All Locations' },
                ...getUniqueLocations().map(location => ({ value: location, label: location }))
              ]}
              values={selectedLocations}
              onChange={setSelectedLocations}
              placeholder="All Locations"
              label="Location Filter"
            />
          </div>
        </div>
        <div className="filter-actions">
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSelectedYears(['all']);
              setSelectedMonths(['all']);
              setSelectedLocations(['all']);
            }}
          >
            Clear All Filters
          </button>
        </div>        {/* Key Metrics Cards */}
        <div className="metrics-grid">
          {shouldShowYearComparison() ? (
            // Year Comparison Cards
            <>              <div className="metric-card total-revenue">
                <div className="metric-header">
                  <h3>Total Revenue</h3>
                  <div className="metric-icon">💰</div>
                </div>
                <div className="metric-value metric-value-2024 currency-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.totalRevenue)}
                </div>                <div className="metric-value metric-value-2025 currency-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.totalRevenue)}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>

              <div className="metric-card avg-daily-transactions">
                <div className="metric-header">
                  <h3>Average Daily Transactions</h3>
                  <div className="metric-icon">📈</div>
                </div>
                <div className="metric-value metric-value-2024">
                  2024: {formatNumber(metrics.yearComparison.year2024.averageDailyTransactions)}
                </div>
                <div className="metric-value metric-value-2025">
                  2025: {formatNumber(metrics.yearComparison.year2025.averageDailyTransactions)}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>

              <div className="metric-card total-orders">
                <div className="metric-header">
                  <h3>Total Transactions</h3>
                  <div className="metric-icon">📋</div>
                </div>
                <div className="metric-value metric-value-2024">
                  2024: {formatNumber(metrics.yearComparison.year2024.totalTransactions)}
                </div>                <div className="metric-value metric-value-2025">
                  2025: {formatNumber(metrics.yearComparison.year2025.totalTransactions)}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>              <div className="metric-card avg-order">
                <div className="metric-header">
                  <h3>Average Transaction Value</h3>
                  <div className="metric-icon">💳</div>
                </div>
                <div className="metric-value metric-value-2024 currency-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.averageOrderValue)}
                </div>
                <div className="metric-value metric-value-2025 currency-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.averageOrderValue)}
                </div>
                <div className="metric-change positive">
                  {selectedMonths.length === 1 ? 
                    `${(['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])[parseInt(selectedMonths[0])]} Comparison` :
                    `${selectedMonths.length} Months Total`
                  }
                </div>
              </div>

              <div className="metric-card avg-daily-revenue">
                <div className="metric-header">
                  <h3>Average Daily Revenue</h3>
                  <div className="metric-icon">📅</div>
                </div>
                <div className="metric-value metric-value-2024 currency-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.averageDailyRevenue)}
                </div>
                <div className="metric-value metric-value-2025 currency-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.averageDailyRevenue)}
                </div>                <div className="metric-change positive">
                  {metrics.yearComparison.year2024.uniqueDays} vs {metrics.yearComparison.year2025.uniqueDays} days
                </div>
              </div>

              <div className="metric-card top-day-sales">
                <div className="metric-header">
                  <h3>Top Day Sales</h3>
                  <div className="metric-icon">🏆</div>
                </div>
                <div className="metric-value metric-value-2024 currency-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.topDaySales.revenue)}
                </div>
                <div className="metric-value metric-value-2025 currency-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.topDaySales.revenue)}
                </div>
                <div className="metric-change positive">
                  {metrics.yearComparison.year2024.topDaySales.dateFormatted} vs {metrics.yearComparison.year2025.topDaySales.dateFormatted}
                </div>
              </div>

              <div className="metric-card top-day-transactions">
                <div className="metric-header">
                  <h3>Top Day Transactions</h3>
                  <div className="metric-icon">📊</div>
                </div>
                <div className="metric-value metric-value-2024">
                  2024: {formatNumber(metrics.yearComparison.year2024.topDayTransactions.transactions)}
                </div>
                <div className="metric-value metric-value-2025">
                  2025: {formatNumber(metrics.yearComparison.year2025.topDayTransactions.transactions)}
                </div>
                <div className="metric-change positive">
                  {metrics.yearComparison.year2024.topDayTransactions.dateFormatted} vs {metrics.yearComparison.year2025.topDayTransactions.dateFormatted}
                </div>
              </div>

              <div className="metric-card returns-summary">
                <div className="metric-header">
                  <h3>Returns Summary</h3>
                  <div className="metric-icon">↩️</div>
                </div>
                <div className="metric-value metric-value-2024 currency-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.returnsMetrics.totalReturns)}
                </div>
                <div className="metric-value metric-value-2025 currency-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.returnsMetrics.totalReturns)}
                </div>
                <div className="metric-change neutral">
                  {metrics.yearComparison.year2024.returnsMetrics.returnTransactions} vs {metrics.yearComparison.year2025.returnsMetrics.returnTransactions} returns
                </div>
              </div>

              <div className="metric-card active-pharmacists">
                <div className="metric-header">
                  <h3>Total Pharmacists</h3>
                  <div className="metric-icon">👨‍⚕️</div>
                </div>
                <div className="metric-value metric-value-2024">
                  2024: {metrics.yearComparison.year2024.activePharmacists || 0}
                </div>
                <div className="metric-value metric-value-2025">
                  2025: {metrics.yearComparison.year2025.activePharmacists || 0}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>
            </>
          ) : (
            // Regular Cards
            <>
              {/* 1. Total Revenue */}
              <div className="metric-card total-revenue">
                <div className="metric-header">
                  <h3>Total Revenue</h3>
                  <div className="metric-icon">💰</div>
                </div>
                <div className="metric-value currency-value">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="metric-change positive">
                  {getFilterSummary()}
                </div>
              </div>

              {/* 2. Average Daily Revenue */}
              <div className="metric-card avg-daily-revenue">
                <div className="metric-header">
                  <h3>Average Daily Revenue</h3>
                  <div className="metric-icon">📅</div>
                </div>
                <div className="metric-value currency-value">
                  {formatCurrency(metrics.averageDailyRevenue)}
                </div>
                <div className="metric-change positive">
                  {metrics.uniqueDays} active days
                </div>
              </div>

              {/* 3. Total Transactions */}
              <div className="metric-card total-orders">
                <div className="metric-header">
                  <h3>Total Transactions</h3>
                  <div className="metric-icon">📋</div>
                </div>
                <div className="metric-value">
                  {formatNumber(metrics.totalTransactions)}
                </div>
                <div className="metric-change positive">
                  {getFilterSummary()}
                </div>
              </div>

              {/* 4. Average Daily Transactions */}
              <div className="metric-card avg-daily-transactions">
                <div className="metric-header">
                  <h3>Average Daily Transactions</h3>
                  <div className="metric-icon">📊</div>
                </div>
                <div className="metric-value">
                  {formatNumber(metrics.averageDailyTransactions)}
                </div>
                <div className="metric-change positive">
                  {metrics.uniqueDays} active days
                </div>
              </div>

              {/* 5. Top Day Sales */}
              <div className="metric-card top-day-sales">
                <div className="metric-header">
                  <h3>Top Day Sales</h3>
                  <div className="metric-icon">🏆</div>
                </div>
                <div className="metric-value currency-value">
                  {formatCurrency(metrics.topDaySales.revenue)}
                </div>
                <div className="metric-change positive">
                  {metrics.topDaySales.dayName}, {metrics.topDaySales.dateFormatted}
                </div>
              </div>

              {/* 6. Top Day Transactions */}
              <div className="metric-card top-day-transactions">
                <div className="metric-header">
                  <h3>Top Day Transactions</h3>
                  <div className="metric-icon">📊</div>
                </div>
                <div className="metric-value">
                  {formatNumber(metrics.topDayTransactions.transactions)}
                </div>
                <div className="metric-change positive">
                  {metrics.topDayTransactions.dayName}, {metrics.topDayTransactions.dateFormatted}
                </div>
              </div>

              {/* 7. Average Order Value */}
              <div className="metric-card avg-order">
                <div className="metric-header">
                  <h3>Average Transaction Value</h3>
                  <div className="metric-icon">💳</div>
                </div>
                <div className="metric-value currency-value">
                  {formatCurrency(metrics.averageOrderValue)}
                </div>
                <div className="metric-change positive">
                  {getFilterSummary()}
                </div>
              </div>

              {/* 8. Returns Summary */}
              <div className="metric-card returns-summary">
                <div className="metric-header">
                  <h3>Returns Summary</h3>
                  <div className="metric-icon">↩️</div>
                </div>
                <div className="metric-value currency-value">
                  {formatCurrency(metrics.totalReturns)}
                </div>
                <div className="metric-change neutral">
                  {metrics.returnTransactions} returns ({((metrics.totalReturns / (metrics.grossSales || 1)) * 100).toFixed(1)}%)
                </div>
              </div>

              {/* 9. Active Pharmacists */}
              <div className="metric-card active-pharmacists">
                <div className="metric-header">
                  <h3>Total Pharmacists</h3>
                  <div className="metric-icon">👨‍⚕️</div>
                </div>
                <div className="metric-value">
                  {metrics.activePharmacists}
                </div>
                <div className="metric-change neutral">
                  {getFilterSummary()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Monthly Revenue Trend */}
          <div className="chart-card half-width">
            <h3><span role="img" aria-label="Revenue">💰</span> {getChartTitle()}</h3>
            <Line
              data={{
                labels: metrics.monthlyComparison.months,
                datasets: [{
                  label: '2024',
                  data: metrics.monthlyComparison.data2024,
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointBackgroundColor: '#3b82f6',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 8,
                  pointHoverRadius: 10,
                }, {
                  label: '2025',
                  data: metrics.monthlyComparison.data2025,
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointBackgroundColor: '#10b981',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 8,
                  pointHoverRadius: 10,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                    bottom: 30,
                    left: 20,
                    right: 20
                  }
                },
                plugins: {
                  legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      color: '#ffffff',
                      font: {
                        size: 12,
                        weight: '500'
                      }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    callbacks: {
                      title: function(context) {
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          // Show specific month name for the hovered data point
                          const hoveredMonth = context[0].label;
                          return `${hoveredMonth} - Year Comparison`;
                        }
                        return `Month: ${context[0].label}`;
                      },
                      label: function(context) {
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          // Show specific month name for the hovered data point
                          const hoveredMonth = context.label;
                          return `${context.dataset.label} ${hoveredMonth}: ${formatCurrency(context.parsed.y)}`;
                        }
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Revenue',
                      color: '#ffffff',
                      font: {
                        size: 14,
                        weight: '600'
                      },
                      padding: {
                        bottom: 10
                      }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                      drawBorder: false,
                    },
                    ticks: {
                      color: '#ffffff',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      callback: function(value) {
                        return formatCurrency(value);
                      },
                      padding: 15
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Month',
                      color: '#ffffff',
                      font: {
                        size: 14,
                        weight: '600'
                      },
                      padding: {
                        top: 10
                      }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                      drawBorder: false,
                    },
                    ticks: {
                      color: '#ffffff',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      maxRotation: 45,
                      minRotation: 0
                    }
                  }
                }
              }}
            />
          </div>

          {/* Monthly Transaction Trend */}
          <div className="chart-card half-width">
            <h3><span role="img" aria-label="Transactions">🔄</span> {getTransactionChartTitle()}</h3>
            <Line
              data={{
                labels: metrics.monthlyComparison.months,
                datasets: [{
                  label: '2024',
                  data: metrics.monthlyComparison.transactions2024,
                  borderColor: '#ec4899',
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointBackgroundColor: '#ec4899',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 8,
                  pointHoverRadius: 10,
                }, {
                  label: '2025',
                  data: metrics.monthlyComparison.transactions2025,
                  borderColor: '#f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointBackgroundColor: '#f59e0b',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 8,
                  pointHoverRadius: 10,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                    bottom: 30,
                    left: 20,
                    right: 20
                  }
                },
                plugins: {
                  legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      color: '#ffffff',
                      font: {
                        size: 12,
                        weight: '500'
                      }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    callbacks: {
                      title: function(context) {
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          // Show specific month name for the hovered data point
                          const hoveredMonth = context[0].label;
                          return `${hoveredMonth} - Year Comparison`;
                        }
                        return `Month: ${context[0].label}`;
                      },
                      label: function(context) {
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          // Show specific month name for the hovered data point
                          const hoveredMonth = context.label;
                          return `${context.dataset.label} ${hoveredMonth}: ${formatNumber(context.parsed.y)} transactions`;
                        }
                        return `${context.dataset.label}: ${formatNumber(context.parsed.y)} transactions`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Transactions',
                      color: '#ffffff',
                      font: {
                        size: 14,
                        weight: '600'
                      },
                      padding: {
                        bottom: 10
                      }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                      drawBorder: false,
                    },
                    ticks: {
                      color: '#ffffff',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      callback: function(value) {
                        return formatNumber(value);
                      },
                      padding: 15
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Month',
                      color: '#ffffff',
                      font: {
                        size: 14,
                        weight: '600'
                      },
                      padding: {
                        top: 10
                      }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                      drawBorder: false,
                    },
                    ticks: {
                      color: '#ffffff',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      maxRotation: 45,
                      minRotation: 0,
                      padding: 15
                    }
                  }
                }
              }}
            />
          </div>

          {/* Top Pharmacists */}          <div className="chart-card pharmacist-chart">
            <h3>🏆 Top 10 Performing Pharmacists {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
            <Bar
              data={{                labels: shouldShowYearComparison() ? 
                  (metrics.yearComparison.pharmacistComparison || []).slice(0, 10).map((p, index) => 
                    `${index + 1}. ${(p.name || 'Unknown').split(' ')[0]}`
                  ) :
                  (metrics.topPharmacists || []).slice(0, 10).map((p, index) => 
                    `${index + 1}. ${p.name || 'Unknown'}`
                  ),
                datasets: shouldShowYearComparison() ? [                  {
                    label: '2024 Revenue',
                    data: (metrics.yearComparison.pharmacistComparison || []).slice(0, 10).map(p => p.revenue2024 || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(59, 130, 246, 0.9)',
                    hoverBorderColor: '#1d4ed8',
                    hoverBorderWidth: 3,
                  },
                  {
                    label: '2025 Revenue',
                    data: (metrics.yearComparison.pharmacistComparison || []).slice(0, 10).map(p => p.revenue2025 || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
                    hoverBorderColor: '#059669',
                    hoverBorderWidth: 3,
                  }                ] : [{
                  label: 'Revenue',
                  data: (metrics.topPharmacists || []).slice(0, 10).map(p => p.revenue || 0),
                  backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',   // Blue - 1st place
                    'rgba(16, 185, 129, 0.8)',   // Green - 2nd place
                    'rgba(245, 158, 11, 0.8)',   // Amber - 3rd place
                    'rgba(139, 92, 246, 0.8)',   // Purple - 4th place
                    'rgba(239, 68, 68, 0.8)',    // Red - 5th place
                    'rgba(20, 184, 166, 0.8)',   // Teal - 6th place
                    'rgba(249, 115, 22, 0.8)',   // Orange - 7th place
                    'rgba(236, 72, 153, 0.8)',   // Pink - 8th place
                    'rgba(132, 204, 22, 0.8)',   // Lime - 9th place
                    'rgba(156, 163, 175, 0.8)'   // Gray - 10th place
                  ],
                  borderColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
                    '#14b8a6', '#f97316', '#ec4899', '#84cc16', '#9ca3af'
                  ],
                  borderWidth: 2,
                  borderRadius: 6,
                  borderSkipped: false,
                  hoverBackgroundColor: [
                    'rgba(59, 130, 246, 0.9)',   
                    'rgba(16, 185, 129, 0.9)',   
                    'rgba(245, 158, 11, 0.9)',   
                    'rgba(139, 92, 246, 0.9)',   
                    'rgba(239, 68, 68, 0.9)',    
                    'rgba(20, 184, 166, 0.9)',   
                    'rgba(249, 115, 22, 0.9)',   
                    'rgba(236, 72, 153, 0.9)',   
                    'rgba(132, 204, 22, 0.9)',   
                    'rgba(156, 163, 175, 0.9)'   
                  ],
                  hoverBorderWidth: 3,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    display: shouldShowYearComparison(),
                    position: 'top',
                    labels: {
                      color: 'rgba(255, 255, 255, 0.8)',
                      font: {
                        size: 14,
                        weight: '600'
                      },
                      padding: 25,
                    }
                  },
                  tooltip: {
                    enabled: true,
                    mode: shouldShowYearComparison() ? 'index' : 'nearest',
                    intersect: false,
                    callbacks: {
                      title: function(context) {
                        const pharmacist = shouldShowYearComparison() ? 
                          (metrics.yearComparison.pharmacistComparison || [])[context[0].dataIndex]?.name :
                          (metrics.topPharmacists || [])[context[0].dataIndex]?.name;
                        
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                                             'July', 'August', 'September', 'October', 'November', 'December'];
                          const monthContext = selectedMonths.length === 1 ? 
                            monthNames[parseInt(selectedMonths[0])] : 
                            `${selectedMonths.length} months`;
                          return `${pharmacist || 'Unknown'} (${monthContext})`;
                        }
                        return `${pharmacist || 'Unknown'}`;
                      },
                      label: function(context) {
                        const value = formatCurrency(context.parsed.y);
                        if (shouldShowYearComparison()) {
                          const year = context.dataset.label.replace(' Revenue', '');
                          if (!selectedMonths.includes('all')) {
                            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                                               'July', 'August', 'September', 'October', 'November', 'December'];
                            const monthContext = selectedMonths.length === 1 ? 
                              monthNames[parseInt(selectedMonths[0])] : 
                              `${selectedMonths.length} months`;
                            return `${year} (${monthContext}): ${value}`;
                          }
                          return `${year}: ${value}`;
                        }
                        return `Revenue: ${value}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                      drawBorder: false,
                    },
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.7)',
                      font: {
                        size: 13,
                        weight: '500'
                      },
                      callback: function(value) {
                        return formatCurrency(value);
                      },
                      padding: 10,
                      maxTicksLimit: 8
                    }
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.8)',
                      font: {
                        size: shouldShowYearComparison() ? 10 : 12,
                        weight: '600'
                      },
                      maxRotation: shouldShowYearComparison() ? 60 : 45,
                      minRotation: shouldShowYearComparison() ? 60 : 45,
                      padding: 10,
                      callback: function(value, index, values) {
                        const label = this.getLabelForValue(value);
                        if (shouldShowYearComparison() && label.length > 12) {
                          return label.slice(0, 12) + '…';
                        }
                        return label;
                      }
                    }
                  }
                }
              }}
            />
          </div>

          {/* Payment Methods Chart */}
          <div className="chart-card payment-methods-chart">
            <h3>💳 Revenue by Payment Method {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
            <Doughnut
              data={{
                labels: shouldShowYearComparison() ? 
                  ['Cash 2024', 'Insurance 2024', 'Cash 2025', 'Insurance 2025'] :
                  ['Cash', 'Insurance'],
                datasets: [{
                  data: shouldShowYearComparison() ? [
                    metrics.yearComparison.year2024.paymentMethods?.cash || 0,
                    metrics.yearComparison.year2024.paymentMethods?.credit || 0,
                    metrics.yearComparison.year2025.paymentMethods?.cash || 0,
                    metrics.yearComparison.year2025.paymentMethods?.credit || 0
                  ] : [
                    metrics.paymentMethods.cash || 0,
                    metrics.paymentMethods.credit || 0
                  ],
                  backgroundColor: shouldShowYearComparison() ? [
                    'rgba(34, 197, 94, 0.8)',   // Green for Cash 2024
                    'rgba(59, 130, 246, 0.8)',  // Blue for Insurance 2024
                    'rgba(34, 197, 94, 0.6)',   // Lighter Green for Cash 2025
                    'rgba(59, 130, 246, 0.6)'   // Lighter Blue for Insurance 2025
                  ] : [
                    'rgba(34, 197, 94, 0.8)',   // Green for Cash
                    'rgba(59, 130, 246, 0.8)'   // Blue for Insurance
                  ],
                  borderColor: shouldShowYearComparison() ? [
                    '#22c55e',
                    '#3b82f6',
                    '#16a34a',
                    '#2563eb'
                  ] : [
                    '#22c55e',
                    '#3b82f6'
                  ],
                  borderWidth: 3,
                  hoverBackgroundColor: shouldShowYearComparison() ? [
                    'rgba(34, 197, 94, 0.9)',
                    'rgba(59, 130, 246, 0.9)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(59, 130, 246, 0.7)'
                  ] : [
                    'rgba(34, 197, 94, 0.9)',
                    'rgba(59, 130, 246, 0.9)'
                                   ],
                  hoverBorderWidth: 4,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                    bottom: shouldShowYearComparison() ? 60 : 20,
                    left: 30,
                    right: 20
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: shouldShowYearComparison() ? 'bottom' : 'left',
                    labels: {

                      color: '#ffffff',
                      font: {
                        size: shouldShowYearComparison() ? 12 : 14,
                        weight: '600'
                      },
                      padding: shouldShowYearComparison() ? 20 : 30,
                      usePointStyle: true,
                    }
                  },
                  tooltip: {
                    enabled: true,
                    callbacks: {
                      title: function(context) {
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          // Show month context for year comparison
                          const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                                             'July', 'August', 'September', 'October', 'November', 'December'];
                          const monthContext = selectedMonths.length === 1 ? 
                            monthNames[parseInt(selectedMonths[0])] : 
                            `${selectedMonths.length} months`;
                          return `Payment Methods - ${monthContext} Comparison`;
                        }
                        return shouldShowYearComparison() ? 'Payment Methods - Year Comparison' : 'Payment Methods';
                      },
                      label: function(context) {
                        const value = formatCurrency(context.parsed);
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        
                        if (shouldShowYearComparison() && !selectedMonths.includes('all')) {
                          const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                                             'July', 'August', 'September', 'October', 'November', 'December'];
                          const monthContext = selectedMonths.length === 1 ? 
                            monthNames[parseInt(selectedMonths[0])] : 
                            `${selectedMonths.length} months`;
                          return `${context.label} (${monthContext}): ${value} (${percentage}%)`;
                        }
                        return `${context.label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                },
                elements: {
                  arc: {
                    borderWidth: 3
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Data Tables */}
        <div className="tables-grid">
          {/* Top Pharmacists Performance Table */}
          <div className="table-card pharmacist-performance-card">
            <div className="table-header-section">
              <h3>🏆 Top 10 Performing Pharmacists {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
              <div className="table-subtitle">
                Performance ranking based on net revenue after returns
              </div>
            </div>
            <div className="table-container pharmacist-table-container">
              <table className="pharmacist-performance-table">
                <thead>
                  <tr>
                    <th className="rank-header">Rank</th>
                    <th className="name-header">Pharmacist Name</th>
                    {shouldShowYearComparison() ? (
                      <>
                        <th className="revenue-header">2024 Revenue</th>
                        <th className="revenue-header">2025 Revenue</th>
                        <th className="growth-header">Growth Amount</th>
                        <th className="percentage-header">Growth %</th>
                      </>
                    ) : (
                      <>
                        <th className="revenue-header">Total Revenue</th>
                        <th className="percentage-header">Revenue Cont %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shouldShowYearComparison() ? (
                    (metrics.yearComparison.pharmacistComparison || []).slice(0, 10).map((pharmacist, index) => (
                      <tr key={index} className={`pharmacist-row ${index < 3 ? `top-performer-${index + 1}` : ''}`}>
                        <td className="rank-cell">
                          <div className="rank-badge">
                            <span className="rank-number">
                              {index === 0 ? '🥇' : 
                               index === 1 ? '🥈' : 
                               index === 2 ? '🥉' : 
                               index === 3 ? '🏅' : 
                               index === 4 ? '🎖️' : 
                               index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="name-cell">
                          <div className="pharmacist-info">
                            <span className="pharmacist-name">
                              {pharmacist.name || 'Unknown'}
                            </span>
                            <span className="pharmacist-status">
                              {index < 3 ? '🌟 Top Performer' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="revenue-cell">
                          <span className="revenue-amount">{formatCurrency(pharmacist.revenue2024)}</span>
                        </td>
                        <td className="revenue-cell">
                          <span className="revenue-amount">{formatCurrency(pharmacist.revenue2025)}</span>
                        </td>
                        <td className="growth-cell">
                          <div className="growth-info">
                            <span className={`growth-amount ${pharmacist.growth >= 0 ? 'growth-positive' : 'growth-negative'}`}>
                              {pharmacist.growth >= 0 ? '+' : ''}{formatCurrency(pharmacist.growth)}
                            </span>
                          </div>
                        </td>
                        <td className="percentage-cell">
                          <div className="percentage-badge">
                            <span className={`percentage-value ${pharmacist.growthRate >= 0 ? 'growth-positive' : 'growth-negative'}`}>
                              {pharmacist.growthRate >= 0 ? '+' : ''}{pharmacist.growthRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    (metrics.topPharmacists || []).slice(0, 10).map((pharmacist, index) => (
                      <tr key={index} className={`pharmacist-row ${index < 3 ? `top-performer-${index + 1}` : ''}`}>
                        <td className="rank-cell">
                          <div className="rank-badge">
                            <span className="rank-number">
                              {index === 0 ? '🥇' : 
                               index === 1 ? '🥈' : 
                               index === 2 ? '🥉' : 
                               index === 3 ? '🏅' : 
                               index === 4 ? '🎖️' : 
                               index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="name-cell">
                          <div className="pharmacist-info">
                            <span className="pharmacist-name">
                              {pharmacist.name || 'Unknown'}
                            </span>
                            <span className="pharmacist-status">
                              {index < 3 ? '🌟 Top Performer' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="revenue-cell">
                          <span className="revenue-amount">{formatCurrency(pharmacist.revenue || 0)}</span>
                        </td>
                        <td className="percentage-cell">
                          <div className="percentage-badge">
                            <span className="percentage-value">
                              {((pharmacist.revenue / metrics.totalRevenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="footer">
          <p>Created By Dr.Saad Naiem Ali</p>
        </footer>
          </>
        ) : (
          <ReportsPage />
        )}
      </div>
    </div>
  );
}

export default App;
