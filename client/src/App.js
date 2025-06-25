import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import GoogleDriveConfig from './components/GoogleDriveConfig';
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

  const loadSalesData = () => {
    setLoading(true);
    setError(null);
    
    axios.get('/api/sales-data')
      .then(response => {
        setSalesData(response.data);
        setLoading(false);
      })
      .catch(error => {
        setError('Failed to load sales data');
        setLoading(false);
        console.error('Error loading sales data:', error);
      });
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  const handleDataSourceChange = () => {
    // Refresh data when Google Drive configuration changes
    loadSalesData();
  };// Calculate key metrics from the reference dashboard
  const calculateMetrics = (yearFilters = ['all'], monthFilters = ['all'], locationFilters = ['all']) => {
    if (!salesData || salesData.length === 0) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        topPharmacists: [],
        monthlyTrends: [],
        monthlyComparison: { months: [], data2024: [], data2025: [] },
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

      // Helper function to calculate top days with returns handling
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
          
          const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
          const amount = Number(item.NetRevenueAmount);
          const isReturn = invoiceNumber.includes('-R');
          
          if (isReturn) {
            acc[dateKey].revenue -= amount;
            acc[dateKey].returns += amount;
            acc[dateKey].returnTransactions += 1;
          } else {
            acc[dateKey].revenue += amount;
            acc[dateKey].grossSales += amount;
            acc[dateKey].salesTransactions += 1;
          }
          
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
          const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
          const amount = Number(item.NetRevenueAmount);
          const isReturn = invoiceNumber.includes('-R');
          return sum + (isReturn ? -amount : amount);
        }, 0),
        totalTransactions: data2024.length,
        averageOrderValue: data2024.length > 0 ? data2024.reduce((sum, item) => sum + Number(item.NetRevenueAmount), 0) / data2024.length : 0,
        uniqueDays: new Set(data2024.map(item => new Date(item.Date).toDateString())).size,
        averageDailyRevenue: (() => {
          const revenue = data2024.reduce((sum, item) => {
            const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
            const amount = Number(item.NetRevenueAmount);
            const isReturn = invoiceNumber.includes('-R');
            return sum + (isReturn ? -amount : amount);
          }, 0);
          const days = new Set(data2024.map(item => new Date(item.Date).toDateString())).size;
          return days > 0 ? revenue / days : 0;
        })(),
        paymentMethods: data2024.reduce((acc, item) => {
          acc.cash += Number(item.CASHREVENUE || 0);
          acc.credit += Number(item.CREDITREVENUE || 0);
          return acc;
        }, { cash: 0, credit: 0 }),
        pharmacistStats: data2024.reduce((acc, item) => {
          const pharmacist = item.Pharmacist || 'Unknown';
          acc[pharmacist] = (acc[pharmacist] || 0) + Number(item.NetRevenueAmount);
          return acc;
        }, {}),
        topDaySales: topDays2024.topDaySales,
        topDayTransactions: topDays2024.topDayTransactions
      };      yearComparison.year2025 = {
        totalRevenue: data2025.reduce((sum, item) => {
          const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
          const amount = Number(item.NetRevenueAmount);
          const isReturn = invoiceNumber.includes('-R');
          return sum + (isReturn ? -amount : amount);
        }, 0),
        totalTransactions: data2025.length,
        averageOrderValue: data2025.length > 0 ? data2025.reduce((sum, item) => sum + Number(item.NetRevenueAmount), 0) / data2025.length : 0,
        uniqueDays: new Set(data2025.map(item => new Date(item.Date).toDateString())).size,
        averageDailyRevenue: (() => {
          const revenue = data2025.reduce((sum, item) => {
            const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
            const amount = Number(item.NetRevenueAmount);
            const isReturn = invoiceNumber.includes('-R');
            return sum + (isReturn ? -amount : amount);
          }, 0);
          const days = new Set(data2025.map(item => new Date(item.Date).toDateString())).size;
          return days > 0 ? revenue / days : 0;
        })(),
        paymentMethods: data2025.reduce((acc, item) => {
          acc.cash += Number(item.CASHREVENUE || 0);
          acc.credit += Number(item.CREDITREVENUE || 0);
          return acc;
        }, { cash: 0, credit: 0 }),
        pharmacistStats: data2025.reduce((acc, item) => {
          const pharmacist = item.Pharmacist || 'Unknown';
          acc[pharmacist] = (acc[pharmacist] || 0) + Number(item.NetRevenueAmount);
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

    // Total metrics with returns handling
    const revenueMetrics = validData.reduce((acc, item) => {
      const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
      const amount = Number(item.NetRevenueAmount);
      const isReturn = invoiceNumber.includes('-R');
      
      if (isReturn) {
        // Return transaction - subtract from total revenue
        acc.totalRevenue -= amount;
        acc.totalReturns += amount;
        acc.returnTransactions += 1;
      } else {
        // Regular sale transaction - add to total revenue
        acc.totalRevenue += amount;
        acc.grossSales += amount;
        acc.salesTransactions += 1;
      }
      
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
    const totalTransactions = revenueMetrics.totalTransactions;
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

    // Top Pharmacists
    const pharmacistStats = validData.reduce((acc, item) => {
      const pharmacist = item.Pharmacist || 'Unknown';
      acc[pharmacist] = (acc[pharmacist] || 0) + Number(item.NetRevenueAmount);
      return acc;
    }, {});
    
    const topPharmacists = Object.entries(pharmacistStats)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);    // Monthly trends - adapted for multiple filters
    let monthlyComparison;
    
    // Calculate monthly stats by year once
    const monthlyStatsByYear = validData.reduce((acc, item) => {
      const year = item.Year;
      const month = item.Month;
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = 0;
      
      acc[year][month] += Number(item.NetRevenueAmount);
      return acc;
    }, {});
    
    if (!yearFilters.includes('all') && !monthFilters.includes('all')) {
      // Specific years and months selected - aggregate view
      const totalRevenue = validData.reduce((sum, item) => sum + Number(item.NetRevenueAmount), 0);
      
      monthlyComparison = {
        months: ['Selected Period'],
        data2024: yearFilters.includes('2024') ? [totalRevenue] : [0],
        data2025: yearFilters.includes('2025') ? [totalRevenue] : [0]
      };
    } else if (!yearFilters.includes('all')) {
      // Specific years selected - show monthly breakdown
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyComparison = {
        months: months,
        data2024: yearFilters.includes('2024') ? months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1] || 0) : [],
        data2025: yearFilters.includes('2025') ? months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1] || 0) : []
      };
    } else if (!monthFilters.includes('all')) {
      // Specific months selected - show year comparison
      if (monthFilters.length === 1) {
        // Single month - show year comparison
        monthlyComparison = {
          months: ['2024', '2025'],
          data2024: [monthlyStatsByYear[2024]?.[parseInt(monthFilters[0])] || 0, 0],
          data2025: [0, monthlyStatsByYear[2025]?.[parseInt(monthFilters[0])] || 0]
        };
      } else {
        // Multiple months - show selected months comparison
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const selectedMonthNames = monthFilters.map(m => monthNames[parseInt(m)]);
        monthlyComparison = {
          months: selectedMonthNames,
          data2024: monthFilters.map(m => monthlyStatsByYear[2024]?.[parseInt(m)] || 0),
          data2025: monthFilters.map(m => monthlyStatsByYear[2025]?.[parseInt(m)] || 0)        };
      }
    } else {
      // No filters or all selected - show complete year comparison
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyComparison = {
        months: months,
        data2024: months.map((_, index) => monthlyStatsByYear[2024]?.[index + 1] || 0),
        data2025: months.map((_, index) => monthlyStatsByYear[2025]?.[index + 1] || 0)
      };
    }

    // Keep original monthly trends for backward compatibility
    const monthlyStats = validData.reduce((acc, item) => {
      const monthKey = `${item.Year}-${item.Month.toString().padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + Number(item.NetRevenueAmount);
      return acc;
    }, {});

    const monthlyTrends = Object.entries(monthlyStats)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue by Location
    const locationStats = validData.reduce((acc, item) => {
      const location = item.LOCATIONNAME || 'Unknown';
      acc[location] = (acc[location] || 0) + Number(item.NetRevenueAmount);
      return acc;
    }, {});

    const revenueByLocation = Object.entries(locationStats)
      .map(([location, revenue]) => ({ location, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);    // Payment Methods
    const paymentMethods = validData.reduce((acc, item) => {
      acc.cash += Number(item.CASHREVENUE || 0);
      acc.credit += Number(item.CREDITREVENUE || 0);
      return acc;
    }, { cash: 0, credit: 0 });    // Active Pharmacists Count - unique pharmacists in the filtered period
    const activePharmacists = new Set(
      validData
        .map(item => item.PharmacistName || item.Pharmacist || item.PHARMACISTNAME || 'Unknown')
        .filter(pharmacist => pharmacist && pharmacist !== 'Unknown')
    ).size;    // Calculate daily aggregations for top day metrics (with returns handling)
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
      
      const invoiceNumber = item.INVOICENUMBER || item.InvoiceNumber || '';
      const amount = Number(item.NetRevenueAmount);
      const isReturn = invoiceNumber.includes('-R');
      
      if (isReturn) {
        // Return transaction - subtract from revenue and count separately
        acc[dateKey].revenue -= amount;
        acc[dateKey].returns += amount;
        acc[dateKey].returnTransactions += 1;
      } else {
        // Regular sale transaction - add to revenue
        acc[dateKey].revenue += amount;
        acc[dateKey].grossSales += amount;
        acc[dateKey].salesTransactions += 1;
      }
      
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
    if (!value) return '$0';
    const num = Math.abs(value);
    
    if (num >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return '$' + (value / 1000).toFixed(1) + 'K';
    } else {
      return '$' + value.toFixed(0);
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
    return (      <div className="App">
        <div className="container">
          <h1 className="main-title">
            <img 
              src="https://static.vecteezy.com/system/resources/previews/019/599/688/non_2x/pharmacy-icon-trendy-and-modern-symbol-for-graphic-and-web-design-free-vector.jpg" 
              alt="Pharmacy Icon" 
              className="pharmacy-icon" 
            />
            Pharmacy Dashboard
          </h1>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading sales analytics...</p>
            <p>Processing 300,000+ records...</p>
          </div>
          <footer className="footer">
            <p>Created By Dr.Saad Naiem Ali</p>
          </footer>
        </div>
      </div>
    );
  }

  if (error) {
    return (      <div className="App">
        <div className="container">
          <h1 className="main-title">
            <img 
              src="https://static.vecteezy.com/system/resources/previews/019/599/688/non_2x/pharmacy-icon-trendy-and-modern-symbol-for-graphic-and-web-design-free-vector.jpg" 
              alt="Pharmacy Icon" 
              className="pharmacy-icon" 
            />
            Pharmacy Dashboard
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
      <div className="container">        <h1 className="main-title">
            <img 
              src="https://static.vecteezy.com/system/resources/previews/019/599/688/non_2x/pharmacy-icon-trendy-and-modern-symbol-for-graphic-and-web-design-free-vector.jpg" 
              alt="Pharmacy Icon" 
              className="pharmacy-icon" 
            />
            Pharmacy Dashboard
          </h1>
          {/* Google Drive Configuration */}
        <GoogleDriveConfig onDataSourceChange={handleDataSourceChange} />
        
        {/* Filter Instructions */}
        <div className="filter-instructions">
          <p>
            <img 
              src="https://static.vecteezy.com/system/resources/previews/019/599/688/non_2x/pharmacy-icon-trendy-and-modern-symbol-for-graphic-and-web-design-free-vector.jpg" 
              alt="Pharmacy Icon" 
              className="metric-icon-img" 
              style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}
            />
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
                <div className="metric-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.totalRevenue)}
                </div>                <div className="metric-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.totalRevenue)}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>              <div className="metric-card total-orders">
                <div className="metric-header">
                  <h3>Total Transactions</h3>
                  <div className="metric-icon">📋</div>
                </div>
                <div className="metric-value">
                  2024: {formatNumber(metrics.yearComparison.year2024.totalTransactions)}
                </div>                <div className="metric-value">
                  2025: {formatNumber(metrics.yearComparison.year2025.totalTransactions)}
                </div>
                <div className="metric-change positive">
                  {getMonthSummary()}
                </div>
              </div>              <div className="metric-card avg-order">
                <div className="metric-header">
                  <h3>Average Order Value</h3>
                  <div className="metric-icon">💳</div>
                </div>
                <div className="metric-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.averageOrderValue)}
                </div>
                <div className="metric-value">
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
                <div className="metric-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.averageDailyRevenue)}
                </div>
                <div className="metric-value">
                  2025: {formatCurrency(metrics.yearComparison.year2025.averageDailyRevenue)}
                </div>                <div className="metric-change positive">
                  {metrics.yearComparison.year2024.uniqueDays} vs {metrics.yearComparison.year2025.uniqueDays} days
                </div>
              </div>

              <div className="metric-card top-day-sales">
                <div className="metric-header">
                  <h3>Top Day Sales</h3>
                  <div className="metric-icon">📈</div>
                </div>
                <div className="metric-value">
                  2024: {formatCurrency(metrics.yearComparison.year2024.topDaySales.revenue)}
                </div>
                <div className="metric-value">
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
                <div className="metric-value">
                  2024: {formatNumber(metrics.yearComparison.year2024.topDayTransactions.transactions)}
                </div>
                <div className="metric-value">
                  2025: {formatNumber(metrics.yearComparison.year2025.topDayTransactions.transactions)}
                </div>
                <div className="metric-change positive">
                  {metrics.yearComparison.year2024.topDayTransactions.dateFormatted} vs {metrics.yearComparison.year2025.topDayTransactions.dateFormatted}
                </div>
              </div>

              <div className="metric-card active-pharmacists">
                <div className="metric-header">
                  <h3>Year Comparison</h3>
                  <div className="metric-icon">
                    <img 
                      src="https://static.vecteezy.com/system/resources/previews/019/599/688/non_2x/pharmacy-icon-trendy-and-modern-symbol-for-graphic-and-web-design-free-vector.jpg" 
                      alt="Pharmacy Icon" 
                      className="metric-icon-img" 
                    />
                  </div>
                </div>
                <div className="metric-value">
                  {((metrics.yearComparison.year2025.totalRevenue - metrics.yearComparison.year2024.totalRevenue) / (metrics.yearComparison.year2024.totalRevenue || 1) * 100).toFixed(1)}%
                </div>
                <div className="metric-change positive">
                  Growth Rate
                </div>
              </div>
            </>
          ) : (
            // Regular Cards
            <>
              <div className="metric-card total-revenue">
                <div className="metric-header">
                  <h3>Total Revenue</h3>
                  <div className="metric-icon">💰</div>
                </div>
                <div className="metric-value">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="metric-change positive">
                  {getFilterSummary()}
                </div>
              </div>

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
              </div>              <div className="metric-card avg-order">
                <div className="metric-header">
                  <h3>Average Order Value</h3>
                  <div className="metric-icon">💳</div>
                </div>
                <div className="metric-value">
                  {formatCurrency(metrics.averageOrderValue)}
                </div>
                <div className="metric-change positive">
                  {getFilterSummary()}
                </div>
              </div>              <div className="metric-card avg-daily-revenue">
                <div className="metric-header">
                  <h3>Average Daily Revenue</h3>
                  <div className="metric-icon">📅</div>
                </div>
                <div className="metric-value">
                  {formatCurrency(metrics.averageDailyRevenue)}
                </div>
                <div className="metric-change positive">
                  {metrics.uniqueDays} active days
                </div>
              </div>

              <div className="metric-card top-day-sales">
                <div className="metric-header">
                  <h3>Top Day Sales</h3>
                  <div className="metric-icon">📈</div>
                </div>
                <div className="metric-value">
                  {formatCurrency(metrics.topDaySales.revenue)}
                </div>
                <div className="metric-change positive">
                  {metrics.topDaySales.dayName}, {metrics.topDaySales.dateFormatted}
                </div>
              </div>              <div className="metric-card top-day-transactions">
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

              <div className="metric-card returns-summary">
                <div className="metric-header">
                  <h3>Returns Summary</h3>
                  <div className="metric-icon">↩️</div>
                </div>
                <div className="metric-value">
                  {formatCurrency(metrics.totalReturns)}
                </div>
                <div className="metric-change neutral">
                  {metrics.returnTransactions} returns ({((metrics.totalReturns / (metrics.grossSales || 1)) * 100).toFixed(1)}%)
                </div>
              </div>

              <div className="metric-card active-pharmacists">
                <div className="metric-header">
                  <h3>Active Pharmacists</h3>
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
          {/* Monthly Revenue Trend */}          <div className="chart-card large">
            <h3>{getChartTitle()}</h3>
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
                  pointRadius: 5,
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
                  pointRadius: 5,
                }]
              }}              options={{
                responsive: true,
                maintainAspectRatio: false,                plugins: {
                  legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                        weight: '500'
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value);
                      }
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 0,
                      minRotation: 0
                    }
                  }
                }
              }}
            />
          </div>

          {/* Top Pharmacists */}          <div className="chart-card">
            <h3>Top Performing Pharmacists {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
            <Bar
              data={{                labels: shouldShowYearComparison() ? 
                  (metrics.yearComparison.pharmacistComparison || []).slice(0, 5).map(p => p.name ? p.name.split(' ')[0] : 'Unknown') :
                  (metrics.topPharmacists || []).slice(0, 5).map(p => p.name ? p.name.split(' ')[0] : 'Unknown'),
                datasets: shouldShowYearComparison() ? [                  {
                    label: '2024',
                    data: (metrics.yearComparison.pharmacistComparison || []).slice(0, 5).map(p => p.revenue2024 || 0),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                  },
                  {
                    label: '2025',
                    data: (metrics.yearComparison.pharmacistComparison || []).slice(0, 5).map(p => p.revenue2025 || 0),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                  }                ] : [{
                  data: (metrics.topPharmacists || []).slice(0, 5).map(p => p.revenue || 0),
                  backgroundColor: [
                    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'
                  ],
                  borderColor: [
                    '#1d4ed8', '#dc2626', '#059669', '#d97706', '#7c3aed'
                  ],
                  borderWidth: 1,
                  borderRadius: 4,
                  borderSkipped: false,
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
                        size: 12,
                        weight: '500'
                      },
                      padding: 20,
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                      title: function(context) {
                        const pharmacist = shouldShowYearComparison() ? 
                          (metrics.yearComparison.pharmacistComparison || [])[context[0].dataIndex]?.name :
                          (metrics.topPharmacists || [])[context[0].dataIndex]?.name;
                        return pharmacist || 'Unknown';
                      },
                      label: function(context) {
                        const value = formatCurrency(context.parsed.y);
                        if (shouldShowYearComparison()) {
                          const year = context.dataset.label;
                          return `${year}: ${value}`;
                        }
                        return `Revenue: ${value}`;
                      },
                      afterBody: function(context) {
                        if (shouldShowYearComparison() && context.length > 0) {
                          const pharmacist = (metrics.yearComparison.pharmacistComparison || [])[context[0].dataIndex];
                          if (pharmacist) {
                            const growth = pharmacist.growth;
                            const growthRate = pharmacist.growthRate;
                            return [
                              `Growth: ${growth >= 0 ? '+' : ''}${formatCurrency(growth)}`,
                              `Rate: ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
                            ];
                          }
                        }
                        return [];
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
                        size: 11,
                      },
                      callback: function(value) {
                        return formatCurrency(value);
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.8)',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      maxRotation: 45,
                      minRotation: 0
                    }
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>          {/* Payment Methods */}
          <div className="chart-card">
            <h3>Payment Methods {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
            <Doughnut
              data={{
                labels: shouldShowYearComparison() ? 
                  ['Cash 2024', 'Credit 2024', 'Cash 2025', 'Credit 2025'] : 
                  ['Cash', 'Credit'],
                datasets: [{
                  data: shouldShowYearComparison() ? [
                    metrics.yearComparison.year2024.paymentMethods.cash,
                    metrics.yearComparison.year2024.paymentMethods.credit,
                    metrics.yearComparison.year2025.paymentMethods.cash,
                    metrics.yearComparison.year2025.paymentMethods.credit
                  ] : [metrics.paymentMethods.cash, metrics.paymentMethods.credit],
                  backgroundColor: shouldShowYearComparison() ? 
                    ['#10b981', '#3b82f6', '#059669', '#1d4ed8'] : 
                    ['#10b981', '#3b82f6'],
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  hoverBorderWidth: 4,
                  hoverBorderColor: '#ffffff',
                  hoverBackgroundColor: shouldShowYearComparison() ? 
                    ['#047857', '#1e40af', '#047857', '#1e3a8a'] : 
                    ['#059669', '#2563eb'],
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 13,
                        weight: '600'
                      },
                      color: '#ffffff',
                      generateLabels: function(chart) {
                        const data = chart.data;
                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                        return data.labels.map((label, index) => {
                          const value = data.datasets[0].data[index];
                          const percentage = ((value / total) * 100).toFixed(1);
                          return {
                            text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                            fillStyle: data.datasets[0].backgroundColor[index],
                            strokeStyle: data.datasets[0].backgroundColor[index],
                            pointStyle: 'circle',
                            fontColor: '#ffffff'
                          };
                        });
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                      label: function(context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                      }
                    }
                  }
                },
                cutout: '65%',
                layout: {
                  padding: {
                    top: 10,
                    bottom: 20,
                    left: 10,
                    right: 10
                  }
                },
                animation: {
                  animateRotate: true,
                  duration: 1000
                }
              }}
            />
          </div>
        </div>

        {/* Data Tables */}
        <div className="tables-grid">
          {/* Top Locations */}
          <div className="table-card">
            <h3>Revenue by Location</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Revenue</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>                  {metrics.revenueByLocation.map((location, index) => (
                    <tr key={index}>
                      <td>{location.location}</td>
                      <td>{formatCurrency(location.revenue)}</td>
                      <td>{((location.revenue / metrics.totalRevenue) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>          {/* Top Pharmacists Table */}
          <div className="table-card">
            <h3>Top Pharmacists Performance {shouldShowYearComparison() ? '- Year Comparison' : ''}</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Pharmacist</th>
                    {shouldShowYearComparison() ? (
                      <>
                        <th>2024 Revenue</th>
                        <th>2025 Revenue</th>
                        <th>Growth</th>
                        <th>Growth %</th>
                      </>
                    ) : (
                      <>
                        <th>Revenue</th>
                        <th>Percentage</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>                  {shouldShowYearComparison() ? (
                    (metrics.yearComparison.pharmacistComparison || []).slice(0, 8).map((pharmacist, index) => (
                      <tr key={index}>
                        <td>#{index + 1}</td>
                        <td>{pharmacist.name}</td>
                        <td>{formatCurrency(pharmacist.revenue2024)}</td>
                        <td>{formatCurrency(pharmacist.revenue2025)}</td>
                        <td style={{color: pharmacist.growth >= 0 ? '#10b981' : '#ef4444'}}>
                          {pharmacist.growth >= 0 ? '+' : ''}{formatCurrency(pharmacist.growth)}
                        </td>
                        <td style={{color: pharmacist.growthRate >= 0 ? '#10b981' : '#ef4444'}}>
                          {pharmacist.growthRate >= 0 ? '+' : ''}{pharmacist.growthRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))                  ) : (
                    (metrics.topPharmacists || []).slice(0, 8).map((pharmacist, index) => (
                      <tr key={index}>
                        <td>#{index + 1}</td>
                        <td>{pharmacist.name}</td>
                        <td>{formatCurrency(pharmacist.revenue)}</td>
                        <td>{((pharmacist.revenue / metrics.totalRevenue) * 100).toFixed(1)}%</td>
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
      </div>
    </div>
  );
}

export default App;
