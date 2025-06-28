import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Reports.css';

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

const Reports = () => {  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState(['01']);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [viewMode, setViewMode] = useState('overview');
  const [chartType, setChartType] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareWith, setCompareWith] = useState('');
  const [dataStats, setDataStats] = useState({ totalRows: 0, filteredRows: 0 });// Debounced filter function to prevent excessive re-renders
  const debounceTimeout = React.useRef(null);
  
  const debounceFilters = useCallback((years, months, locations) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      setDataLoading(true);
      filterDataOptimized(years, months, locations);
    }, 300);
  }, []);  // Optimized data filtering with fallback and debugging
  const filterDataOptimized = useCallback(async (years, months, locations) => {
    console.log('filterDataOptimized called with:', { years, months, locations: locations.slice(0, 3) });
    setDataLoading(true);
    
    try {
      if (metadata) {
        console.log('Using optimized backend filtering...');
        
        // Ensure we have filters, if not, use defaults
        const yearsToFilter = years.length > 0 ? years : [availableYears[0]?.toString()].filter(Boolean);
        const monthsToFilter = months.length > 0 ? months : ['01'];
        const locationsToFilter = locations.length > 0 ? locations : availableLocations.slice(0, 2).map(loc => loc.name);
        
        console.log('Normalized filters:', { yearsToFilter, monthsToFilter, locationsToFilter });
        
        // Use new optimized backend filtering
        const params = new URLSearchParams();
        yearsToFilter.forEach(year => params.append('years', year));
        monthsToFilter.forEach(month => params.append('months', month));
        locationsToFilter.forEach(location => params.append('locations', location));
        params.append('limit', '20000'); // Reasonable limit for frontend processing
        
        console.log('Calling API with params:', params.toString());
        const response = await axios.get(`/api/sales-data-filtered?${params.toString()}`, {
          timeout: 60000 // 60 second timeout
        });
        const result = response.data;
        
        console.log('API response received:', {
          dataCount: result.data?.length,
          totalFiltered: result.metadata?.total_filtered
        });
        
        // Add Date field for consistent processing
        const processedData = result.data.map(item => ({
          ...item,
          Date: item.Date || item.INVOICEDATE,
          NETREVENUEAMOUNT: item.NetRevenueAmount || item.NETREVENUEAMOUNT
        }));
        
        setFilteredData(processedData);
        setDataStats({
          totalRows: metadata.total_rows,
          filteredRows: result.metadata.total_filtered
        });
        
        console.log('Filtered data set successfully:', {
          processedCount: processedData.length,
          filteredRows: result.metadata.total_filtered
        });
        
      } else {
        console.log('Using fallback frontend filtering...');
        // Fallback to original frontend filtering
        if (!salesData || salesData.length === 0) {
          setFilteredData([]);
          setDataLoading(false);
          return;
        }

        // Process data in chunks to prevent UI blocking
        const chunkSize = 5000;
        const filtered = [];
        const yearsSet = new Set(years);
        const monthsSet = new Set(months);
        const locationsSet = new Set(locations);
        
        const processChunk = (startIndex) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              const endIndex = Math.min(startIndex + chunkSize, salesData.length);
              
              for (let i = startIndex; i < endIndex; i++) {
                const item = salesData[i];
                if (!item.Date && !item.INVOICEDATE) continue;
                
                const date = new Date(item.Date || item.INVOICEDATE);
                const year = date.getFullYear().toString();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const location = item.LOCATIONNAME;
                
                if ((yearsSet.size === 0 || yearsSet.has(year)) &&
                    (monthsSet.size === 0 || monthsSet.has(month)) &&
                    (locationsSet.size === 0 || locationsSet.has(location))) {
                  filtered.push({ ...item, Date: item.Date || item.INVOICEDATE });
                }
              }
              resolve(endIndex);
            }, 0);
          });
        };

        // Process all chunks
        for (let i = 0; i < salesData.length; i += chunkSize) {
          await processChunk(i);
        }

        setFilteredData(filtered);
        setDataStats({
          totalRows: salesData.length,
          filteredRows: filtered.length
        });      }
      
    } catch (error) {
      console.error('Error filtering data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // If backend filtering fails, try fallback method
      if (metadata && salesData.length === 0) {
        console.log('Backend filtering failed, but no fallback data available. Setting error state.');
        setError(`Failed to filter data: ${error.message}`);
      } else {
        console.log('Backend filtering failed, using fallback method if available...');
        // The fallback logic should already be handled above
      }
    } finally {
      setDataLoading(false);
    }
  }, [metadata, salesData]);

// Utility functions
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0';
    const num = Math.abs(value);
    
    if (num >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else {
      return value.toLocaleString();
    }
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    return value.toLocaleString();
  };

  const formatPercentage = (value) => {
    return value.toFixed(1) + '%';
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getMetricValue = (item, metric) => {
    switch (metric) {
      case 'revenue': return item.totalRevenue;
      case 'transactions': return item.totalTransactions;
      case 'returns': return item.returns;
      case 'net': return item.netRevenue;
      default: return 0;
    }
  };

  const getMetricLabel = (metric) => {
    switch (metric) {
      case 'revenue': return 'Total Revenue';
      case 'transactions': return 'Transactions';
      case 'returns': return 'Returns';
      case 'net': return 'Net Revenue';
      default: return 'Revenue';
    }  };
  // Memoized available years - works with both metadata and fallback
  const availableYears = useMemo(() => {
    if (metadata?.available_years) {
      return metadata.available_years;
    }
    
    // Fallback to original method if metadata not available
    if (salesData.length > 0) {
      const years = new Set();
      const sampleSize = Math.min(10000, salesData.length);
      for (let i = 0; i < sampleSize; i++) {
        const item = salesData[i];
        if (item.Date || item.INVOICEDATE) {
          const date = new Date(item.Date || item.INVOICEDATE);
          years.add(date.getFullYear());
        }
      }
      return Array.from(years).sort((a, b) => b - a);
    }
    
    return [];
  }, [metadata, salesData]);

  const getAvailableYears = () => availableYears;// Memoized available months - simplified for better performance
  const getAvailableMonths = useMemo(() => {
    return (years) => {
      // Return all months 1-12 for simplicity when using filtered API
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(i);
      }
      return months;
    };
  }, []);
  // Memoized available locations - works with both metadata and fallback
  const availableLocations = useMemo(() => {
    if (metadata?.sample_locations) {
      return metadata.sample_locations.map((name, index) => ({
        id: `loc_${index}`,
        name: name
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Fallback to original method if metadata not available
    if (salesData.length > 0) {
      const locationMap = new Map();
      const sampleSize = Math.min(20000, salesData.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const item = salesData[i];
        if (item.LOCATIONNAME && !locationMap.has(item.LOCATIONNAME)) {
          locationMap.set(item.LOCATIONNAME, {
            id: item.LOCATIONID || `loc_${i}`,
            name: item.LOCATIONNAME
          });
        }
      }
      
      return Array.from(locationMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return [];
  }, [metadata, salesData]);

  const getAvailableLocations = () => availableLocations;
  const handleMultiSelect = (currentValues, newValue, setter, filterType) => {
    let newValues;
    if (currentValues.includes(newValue)) {
      newValues = currentValues.filter(val => val !== newValue);
    } else {
      newValues = [...currentValues, newValue];
    }
    
    setter(newValues);
    
    // Trigger debounced filtering
    if (filterType === 'years') {
      debounceFilters(newValues, selectedMonths, selectedLocations);
    } else if (filterType === 'months') {
      debounceFilters(selectedYears, newValues, selectedLocations);
    } else if (filterType === 'locations') {
      debounceFilters(selectedYears, selectedMonths, newValues);
    }
  };

  const handleSelectAll = (allValues, currentValues, setter, filterType) => {
    const newValues = currentValues.length === allValues.length ? [] : allValues;
    setter(newValues);
    
    // Trigger debounced filtering
    if (filterType === 'years') {
      debounceFilters(newValues, selectedMonths, selectedLocations);
    } else if (filterType === 'months') {
      debounceFilters(selectedYears, newValues, selectedLocations);
    } else if (filterType === 'locations') {
      debounceFilters(selectedYears, selectedMonths, newValues);
    }
  };  // Initialize default selections and trigger initial filtering - simplified
  useEffect(() => {
    console.log('Initialization effect triggered:', {
      hasMetadata: !!metadata,
      availableYearsCount: availableYears.length,
      availableLocationsCount: availableLocations.length,
      selectedYearsCount: selectedYears.length,
      selectedLocationsCount: selectedLocations.length
    });

    if (metadata && availableYears.length > 0 && availableLocations.length > 0) {
      let shouldTriggerFilter = false;
      let yearsToUse = selectedYears;
      let locationsToUse = selectedLocations;
      
      // Set default years if none selected
      if (selectedYears.length === 0) {
        const defaultYear = [availableYears[0].toString()];
        setSelectedYears(defaultYear);
        yearsToUse = defaultYear;
        shouldTriggerFilter = true;
        console.log('Set default years:', defaultYear);
      }
      
      // Set default locations if none selected  
      if (selectedLocations.length === 0) {
        const defaultLocations = availableLocations.slice(0, 2).map(loc => loc.name);
        setSelectedLocations(defaultLocations);
        locationsToUse = defaultLocations;
        shouldTriggerFilter = true;
        console.log('Set default locations:', defaultLocations);
      }
      
      // Trigger initial filtering if we have data and selections
      if (shouldTriggerFilter || (yearsToUse.length > 0 && locationsToUse.length > 0 && filteredData.length === 0)) {
        console.log('Triggering initial filter with:', {
          years: yearsToUse,
          months: selectedMonths,
          locations: locationsToUse
        });
        // Use setTimeout to ensure state updates are processed first
        setTimeout(() => {
          debounceFilters(yearsToUse, selectedMonths, locationsToUse);
        }, 100);
      }
    }
  }, [metadata, availableYears, availableLocations]);// Fetch metadata first, then main data with fallback and timeout
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try new metadata endpoint first with timeout
        console.log('Fetching metadata...');
        try {
          const metaResponse = await axios.get('/api/sales-data-meta', { 
            timeout: 30000 // 30 second timeout for metadata
          });
          setMetadata(metaResponse.data);
          setDataStats({
            totalRows: metaResponse.data.total_rows,
            filteredRows: 0
          });
          
          console.log('Metadata loaded:', {
            rows: metaResponse.data.total_rows,
            years: metaResponse.data.available_years.length,
            locations: metaResponse.data.sample_locations.length
          });
          
          // Set salesData to a placeholder for compatibility
          setSalesData([]);
            // DEBUG: Load some sample data immediately to test display
          setTimeout(async () => {
            try {
              console.log('Loading test data...');
              const sampleResponse = await axios.get('/api/test-data');
              if (sampleResponse.data.data.length > 0) {
                console.log('Test data loaded successfully:', sampleResponse.data.data.length);
                const sampleData = sampleResponse.data.data.map(item => ({
                  ...item,
                  Date: item.Date || item.INVOICEDATE,
                  NETREVENUEAMOUNT: item.NetRevenueAmount || item.NETREVENUEAMOUNT
                }));
                setFilteredData(sampleData);
                setDataStats(prev => ({ ...prev, filteredRows: sampleData.length }));
              }
            } catch (sampleError) {
              console.log('Test data fetch failed:', sampleError.message);
              // Try the original filtered endpoint as backup
              try {
                const backupResponse = await axios.get('/api/sales-data-filtered?years=2024&months=1&limit=50');
                if (backupResponse.data.data.length > 0) {
                  console.log('Backup data loaded:', backupResponse.data.data.length);
                  const backupData = backupResponse.data.data.map(item => ({
                    ...item,
                    Date: item.Date || item.INVOICEDATE,
                    NETREVENUEAMOUNT: item.NetRevenueAmount || item.NETREVENUEAMOUNT
                  }));
                  setFilteredData(backupData);
                  setDataStats(prev => ({ ...prev, filteredRows: backupData.length }));
                }
              } catch (backupError) {
                console.log('Backup data also failed:', backupError.message);
              }
            }
          }, 1000);
          
        } catch (metaError) {
          console.log('Metadata endpoint failed, falling back to original method:', metaError.message);
          
          // Fallback to original method with longer timeout
          const response = await axios.get('/api/sales-data', {
            timeout: 120000 // 2 minute timeout for full dataset
          });
          setSalesData(response.data);
          setDataStats({
            totalRows: response.data.length,
            filteredRows: 0
          });
          
          // Set metadata to null to use original processing
          setMetadata(null);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        const errorMessage = error.code === 'ECONNABORTED' 
          ? 'Request timed out. The dataset is very large (300K+ rows). Please wait and try again.'
          : 'Failed to load analytics data. Please check your data source configuration.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);// Enhanced daily report using filtered data for better performance
  const dailyReportData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const dailyStats = {};
    
    // Process filtered data only (much smaller dataset)
    filteredData.forEach(item => {
      if (!item.Date) return;
      
      const date = new Date(item.Date);
      const day = date.getDate();
      const monthNum = date.getMonth() + 1;
      const yearNum = date.getFullYear();
      const dayKey = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = {
          day: day,
          month: monthNum,
          year: yearNum,
          dayName: dayName,
          date: date.toISOString().split('T')[0],
          totalRevenue: 0,
          totalTransactions: 0,
          returns: 0,
          netRevenue: 0,
          returnRate: 0,
          avgTransactionValue: 0,
          growth: 0
        };
      }

      const amount = parseFloat(item.NETREVENUEAMOUNT) || 0;
      
      // Backend already processed returns (negative amounts are returns)
      if (amount < 0) {
        // This is a return transaction (already negated by backend)
        dailyStats[dayKey].returns += Math.abs(amount);
      } else {
        // This is a regular sale transaction
        dailyStats[dayKey].totalRevenue += amount;
        dailyStats[dayKey].totalTransactions += 1;
      }
    });

    // Calculate derived metrics and growth
    const sortedDays = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedDays.forEach((day, index) => {
      // Since backend already processes returns, totalRevenue is already net
      day.netRevenue = day.totalRevenue;
      day.returnRate = (day.totalRevenue + day.returns) > 0 ? (day.returns / (day.totalRevenue + day.returns)) * 100 : 0;
      day.avgTransactionValue = day.totalTransactions > 0 ? day.totalRevenue / day.totalTransactions : 0;
      
      // Calculate growth compared to previous day
      if (index > 0) {
        const previousDay = sortedDays[index - 1];
        day.growth = calculateGrowth(day.netRevenue, previousDay.netRevenue);
      }    });    return sortedDays;
  }, [filteredData]);

  // Enhanced monthly report using filtered data for better performance
  const monthlyReportData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const monthlyStats = {};    
    // Process filtered data only
    filteredData.forEach(item => {
      if (!item.Date) return;
      
      const date = new Date(item.Date);
      const month = date.getMonth() + 1;
      const yearNum = date.getFullYear();
      const monthKey = `${yearNum}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: month,
          year: yearNum,
          monthName: new Date(yearNum, month - 1, 1).toLocaleString('default', { month: 'long' }),
          yearMonth: `${new Date(yearNum, month - 1, 1).toLocaleString('default', { month: 'long' })} ${yearNum}`,
          totalRevenue: 0,
          totalTransactions: 0,
          returns: 0,
          netRevenue: 0,
          returnRate: 0,
          avgTransactionValue: 0,
          growth: 0
        };
      }

      const amount = parseFloat(item.NETREVENUEAMOUNT) || 0;
      
      // Backend already processed returns (negative amounts are returns)
      if (amount < 0) {
        // This is a return transaction (already negated by backend)
        monthlyStats[monthKey].returns += Math.abs(amount);
      } else {
        // This is a regular sale transaction
        monthlyStats[monthKey].totalRevenue += amount;
        monthlyStats[monthKey].totalTransactions += 1;
      }
    });

    // Calculate derived metrics and growth
    const sortedMonths = Object.values(monthlyStats).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    sortedMonths.forEach((month, index) => {
      // Since backend already processes returns, totalRevenue is already net
      month.netRevenue = month.totalRevenue;
      month.returnRate = (month.totalRevenue + month.returns) > 0 ? (month.returns / (month.totalRevenue + month.returns)) * 100 : 0;
      month.avgTransactionValue = month.totalTransactions > 0 ? month.totalRevenue / month.totalTransactions : 0;
      
      // Calculate growth compared to previous month
      if (index > 0) {
        const previousMonth = sortedMonths[index - 1];
        month.growth = calculateGrowth(month.netRevenue, previousMonth.netRevenue);
      }
    });

    return sortedMonths;
  }, [filteredData]);

  const yearlyReportData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const yearlyStats = {};
    
    // Process filtered data only
    filteredData.forEach(item => {
      if (!item.Date) return;
      
      const date = new Date(item.Date);
      const year = date.getFullYear();
      
      if (!yearlyStats[year]) {
        yearlyStats[year] = {
          year: year,
          totalRevenue: 0,
          totalTransactions: 0,
          returns: 0,
          netRevenue: 0,
          returnRate: 0,
          avgTransactionValue: 0,
          growth: 0
        };
      }

      const amount = parseFloat(item.NETREVENUEAMOUNT) || 0;
      
      // Backend already processed returns (negative amounts are returns)
      if (amount < 0) {
        // This is a return transaction (already negated by backend)
        yearlyStats[year].returns += Math.abs(amount);
      } else {
        // This is a regular sale transaction
        yearlyStats[year].totalRevenue += amount;
        yearlyStats[year].totalTransactions += 1;
      }
    });

    // Calculate derived metrics and growth
    const sortedYears = Object.values(yearlyStats).sort((a, b) => a.year - b.year);
    sortedYears.forEach((year, index) => {
      // Since backend already processes returns, totalRevenue is already net
      year.netRevenue = year.totalRevenue;
      year.returnRate = (year.totalRevenue + year.returns) > 0 ? (year.returns / (year.totalRevenue + year.returns)) * 100 : 0;
      year.avgTransactionValue = year.totalTransactions > 0 ? year.totalRevenue / year.totalTransactions : 0;
      
      // Calculate growth compared to previous year
      if (index > 0) {
        const previousYear = sortedYears[index - 1];
        year.growth = calculateGrowth(year.netRevenue, previousYear.netRevenue);
      }
    });

    return sortedYears;
  }, [filteredData]);
  // Chart data generation
  const generateChartData = (data, timeLabel) => {
    const labels = data.map(item => {
      if (timeLabel === 'day') return `${item.day}/${item.month} (${item.dayName})`;
      if (timeLabel === 'month') return item.yearMonth || item.monthName;
      return item.year.toString();
    });

    const getDataset = (metric, color) => ({
      label: getMetricLabel(metric),
      data: data.map(item => getMetricValue(item, metric)),
      backgroundColor: color + '80',
      borderColor: color,
      borderWidth: 2,
      fill: chartType === 'line' ? false : true,
    });

    const datasets = [];
    
    if (selectedMetric === 'revenue') {
      datasets.push(getDataset('revenue', '#4F46E5'));
    } else if (selectedMetric === 'transactions') {
      datasets.push(getDataset('transactions', '#10B981'));
    } else if (selectedMetric === 'returns') {
      datasets.push(getDataset('returns', '#EF4444'));
    } else if (selectedMetric === 'net') {
      datasets.push(getDataset('net', '#8B5CF6'));
    } else if (selectedMetric === 'all') {
      datasets.push(
        getDataset('revenue', '#4F46E5'),
        getDataset('returns', '#EF4444'),
        getDataset('net', '#8B5CF6')
      );
    }

    return { labels, datasets };
  };

  const currentData = activeTab === 'daily' ? dailyReportData : 
                     activeTab === 'monthly' ? monthlyReportData : yearlyReportData;
  const timeLabel = activeTab === 'daily' ? 'day' : activeTab === 'monthly' ? 'month' : 'year';
  const chartData = generateChartData(currentData, timeLabel);

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#E5E7EB'
        }
      },
      title: {
        display: true,
        text: `${getMetricLabel(selectedMetric)} - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View`,
        color: '#E5E7EB'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            if (selectedMetric === 'transactions') {
              return `${context.dataset.label}: ${formatNumber(value)}`;
            }
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { 
          color: '#9CA3AF',
          callback: function(value) {
            if (selectedMetric === 'transactions') {
              return formatNumber(value);
            }
            return formatCurrency(value);
          }
        },
        grid: { color: '#374151' }
      }
    }
  };  // Render loading and error states with better user feedback
  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Loading Analytics...</h2>
          <p>
            {dataStats.totalRows 
              ? `Processing ${dataStats.totalRows.toLocaleString()} rows of sales data...` 
              : 'Initializing dashboard and connecting to data source...'
            }
          </p>
          <div className="loading-tips">
            <p><strong>💡 Performance Tip:</strong> Large datasets may take 30-60 seconds to load initially</p>
            <p><strong>🔄 What's happening:</strong> Processing CSV data, calculating analytics, and optimizing for fast filtering</p>
          </div>
          <div className="credit-line">
            <p>Created By <strong>Dr. Saad Naiem Ali</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // Show data processing indicator
  if (dataLoading) {
    return (
      <div className="reports-container">
        <div className="loading-state">
          <div className="loading-spinner small"></div>
          <h2>Filtering Data...</h2>
          <p>Processing {dataStats.filteredRows.toLocaleString()} / {dataStats.totalRows.toLocaleString()} rows</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="reports-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Reports</h2>
          <p>{error}</p>
          
          <div className="error-details">
            <h3>🔧 Troubleshooting:</h3>
            <ul>
              <li><strong>Large Dataset:</strong> Your CSV has 300K+ rows which may take 1-2 minutes to process</li>
              <li><strong>Backend Status:</strong> Ensure Flask server is running on port 5000</li>
              <li><strong>Data Source:</strong> Check if sales.csv exists or Google Drive URL is configured</li>
              <li><strong>Memory:</strong> Large datasets require sufficient system memory</li>
            </ul>
          </div>
          
          <div className="error-actions">
            <button className="retry-button" onClick={() => window.location.reload()}>
              🔄 Retry Loading
            </button>
            <button className="config-button" onClick={() => window.location.href = '/'}>
              ⚙️ Check Configuration
            </button>
          </div>
          
          <div className="credit-line">
            <p>Created By <strong>Dr. Saad Naiem Ali</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // Summary stats for overview cards
  const getSummaryStats = () => {
    const totalRevenue = currentData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalReturns = currentData.reduce((sum, item) => sum + item.returns, 0);
    const totalTransactions = currentData.reduce((sum, item) => sum + item.totalTransactions, 0);
    const netRevenue = totalRevenue - totalReturns;
    const avgGrowth = currentData.length > 1 ? 
      currentData.slice(1).reduce((sum, item) => sum + item.growth, 0) / (currentData.length - 1) : 0;

    return { totalRevenue, totalReturns, totalTransactions, netRevenue, avgGrowth };
  };

  const summaryStats = getSummaryStats();

  return (
    <div className="reports-container">
      {/* Header Section */}
      <div className="reports-header">        <div className="header-content">
          <h1>📊 Advanced Analytics Dashboard</h1>
          <p>Comprehensive insights with interactive comparisons and trend analysis</p>
          <div className="data-stats">
            <span>Data: <strong>{dataStats.filteredRows.toLocaleString()}</strong> / <strong>{dataStats.totalRows.toLocaleString()}</strong> rows</span>
          </div>
        </div><div className="header-controls">
          {/* Years Multi-Select */}
          <div className="filter-group">
            <label>Years:</label>
            <div className="multi-select-container">
              <div className="select-all-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedYears.length === getAvailableYears().length}                      onChange={() => handleSelectAll(
                        getAvailableYears().map(y => y.toString()), 
                        selectedYears, 
                        setSelectedYears,
                        'years'
                      )}
                  />
                  Select All Years
                </label>
              </div>
              <div className="checkbox-options">
                {getAvailableYears().map(year => (
                  <label key={year} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year.toString())}
                      onChange={() => handleMultiSelect(selectedYears, year.toString(), setSelectedYears, 'years')}
                    />
                    {year}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Months Multi-Select */}
          {activeTab === 'daily' && (
            <div className="filter-group">
              <label>Months:</label>
              <div className="multi-select-container">
                <div className="select-all-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedMonths.length === getAvailableMonths(selectedYears).length}                      onChange={() => handleSelectAll(
                        getAvailableMonths(selectedYears).map(m => m.toString().padStart(2, '0')), 
                        selectedMonths, 
                        setSelectedMonths,
                        'months'
                      )}
                    />
                    Select All Months
                  </label>
                </div>
                <div className="checkbox-options">
                  {getAvailableMonths(selectedYears).map(month => (
                    <label key={month} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedMonths.includes(month.toString().padStart(2, '0'))}                        onChange={() => handleMultiSelect(
                          selectedMonths, 
                          month.toString().padStart(2, '0'), 
                          setSelectedMonths,
                          'months'
                        )}
                      />
                      {new Date(2025, month - 1, 1).toLocaleString('default', { month: 'long' })}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Locations Multi-Select */}
          <div className="filter-group">
            <label>Locations:</label>
            <div className="multi-select-container">
              <div className="select-all-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedLocations.length === getAvailableLocations().length}                  onChange={() => handleSelectAll(
                    getAvailableLocations().map(loc => loc.name), 
                    selectedLocations, 
                    setSelectedLocations,
                    'locations'
                  )}
                  />
                  Select All Locations
                </label>
              </div>
              <div className="checkbox-options">
                {getAvailableLocations().map(location => (
                  <label key={location.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location.name)}
                      onChange={() => handleMultiSelect(selectedLocations, location.name, setSelectedLocations, 'locations')}
                    />
                    {location.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          📅 Daily Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          📊 Monthly Trends
        </button>
        <button 
          className={`tab-button ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => setActiveTab('yearly')}
        >
          📈 Yearly Overview
        </button>
      </div>

      {/* View Mode Controls */}
      <div className="view-controls">
        <div className="view-mode-buttons">
          <button 
            className={`view-button ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            🎯 Overview
          </button>
          <button 
            className={`view-button ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            📊 Charts
          </button>
          <button 
            className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            📋 Detailed Table
          </button>
        </div>

        {viewMode === 'chart' && (
          <div className="chart-controls">
            <div className="control-group">
              <label>Chart Type:</label>
              <select 
                value={chartType} 
                onChange={(e) => setChartType(e.target.value)}
                className="control-select"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="doughnut">Doughnut Chart</option>
              </select>
            </div>
            <div className="control-group">
              <label>Metric:</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="control-select"
              >
                <option value="revenue">Total Revenue</option>
                <option value="net">Net Revenue</option>
                <option value="transactions">Transactions</option>
                <option value="returns">Returns</option>
                <option value="all">All Metrics</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overview-section">
          {/* Summary Cards */}
          <div className="summary-cards-grid">
            <div className="summary-card revenue">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <h3 className="currency-value">{formatCurrency(summaryStats.totalRevenue)}</h3>
                <p>Total Revenue</p>
                <div className={`growth-indicator ${summaryStats.avgGrowth >= 0 ? 'positive' : 'negative'}`}>
                  {summaryStats.avgGrowth >= 0 ? '↗️' : '↘️'} {formatPercentage(Math.abs(summaryStats.avgGrowth))}
                </div>
              </div>
            </div>
            
            <div className="summary-card net">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <h3 className="currency-value">{formatCurrency(summaryStats.netRevenue)}</h3>
                <p>Net Revenue</p>
                <div className="metric-detail">After Returns</div>
              </div>
            </div>
            
            <div className="summary-card transactions">
              <div className="card-icon">🛒</div>
              <div className="card-content">
                <h3>{formatNumber(summaryStats.totalTransactions)}</h3>
                <p>Total Transactions</p>
                <div className="metric-detail">
                  Avg: {formatCurrency(summaryStats.totalTransactions > 0 ? summaryStats.totalRevenue / summaryStats.totalTransactions : 0)}
                </div>
              </div>
            </div>
            
            <div className="summary-card returns">
              <div className="card-icon">↩️</div>
              <div className="card-content">
                <h3 className="currency-value">{formatCurrency(summaryStats.totalReturns)}</h3>
                <p>Returns</p>
                <div className="metric-detail">
                  Rate: {formatPercentage(summaryStats.totalRevenue > 0 ? (summaryStats.totalReturns / summaryStats.totalRevenue) * 100 : 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="top-performers">
            <h3>🏆 Top Performers ({activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})</h3>
            <div className="performers-grid">
              {currentData
                .sort((a, b) => b.netRevenue - a.netRevenue)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="performer-card">
                    <div className="rank">#{index + 1}</div>
                    <div className="performer-info">                      <h4>
                        {activeTab === 'daily' && `${item.day}/${item.month}/${item.year} (${item.dayName})`}
                        {activeTab === 'monthly' && item.yearMonth}
                        {activeTab === 'yearly' && item.year}
                      </h4>
                      <p className="revenue">{formatCurrency(item.netRevenue)}</p>
                      <p className="transactions">{formatNumber(item.totalTransactions)} transactions</p>
                      {item.growth !== undefined && (
                        <div className={`growth ${item.growth >= 0 ? 'positive' : 'negative'}`}>
                          {item.growth >= 0 ? '↗️' : '↘️'} {formatPercentage(Math.abs(item.growth))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Chart Mode */}
      {viewMode === 'chart' && (
        <div className="chart-section">
          <div className="chart-container">
            {chartType === 'bar' && <Bar data={chartData} options={chartOptions} />}
            {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
            {chartType === 'doughnut' && chartData.datasets[0] && (
              <Doughnut 
                data={{
                  labels: chartData.labels.slice(0, 10), // Limit for better visibility
                  datasets: [{
                    ...chartData.datasets[0],
                    backgroundColor: [
                      '#4F46E5', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B',
                      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
                    ]
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'right',
                      labels: { color: '#E5E7EB' }
                    }
                  }
                }}
              />
            )}
          </div>
          
          {/* Chart Insights */}
          <div className="chart-insights">
            <h4>📊 Key Insights</h4>
            <div className="insights-list">
              <div className="insight">
                <strong>Peak Performance:</strong> {
                  currentData.length > 0 && (() => {
                    const peak = currentData.reduce((max, item) => 
                      getMetricValue(item, selectedMetric) > getMetricValue(max, selectedMetric) ? item : max
                    );
                    return `${activeTab === 'daily' ? `Day ${peak.day}` : 
                            activeTab === 'monthly' ? peak.monthName : peak.year} 
                           with ${selectedMetric === 'transactions' ? 
                             formatNumber(getMetricValue(peak, selectedMetric)) : 
                             formatCurrency(getMetricValue(peak, selectedMetric))}`;
                  })()
                }
              </div>
              <div className="insight">
                <strong>Average Growth:</strong> {formatPercentage(summaryStats.avgGrowth)} 
                {summaryStats.avgGrowth >= 0 ? ' 📈' : ' 📉'}
              </div>
              <div className="insight">
                <strong>Consistency:</strong> {
                  currentData.length > 0 && (() => {
                    const values = currentData.map(item => getMetricValue(item, selectedMetric));
                    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
                    const stdDev = Math.sqrt(variance);
                    const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
                    return cv < 20 ? 'High consistency 🎯' : cv < 40 ? 'Moderate consistency ⚖️' : 'High variability 📊';
                  })()
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <div className="table-section">          <div className="table-header">
            <h3>
              📋 Detailed {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
              {activeTab === 'daily' && selectedYears.length > 0 && selectedMonths.length > 0 && 
                ` - ${selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Years`}, ${selectedMonths.length === 1 ? new Date(2025, parseInt(selectedMonths[0]) - 1, 1).toLocaleString('default', { month: 'long' }) : `${selectedMonths.length} Months`}`}
              {activeTab === 'monthly' && selectedYears.length > 0 && 
                ` - ${selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Years`}`}
              {selectedLocations.length > 0 && selectedLocations.length < getAvailableLocations().length &&
                ` (${selectedLocations.length} Locations)`}
            </h3>
            <div className="table-stats">
              <span>{currentData.length} entries</span>
              <span>Total: {formatCurrency(summaryStats.netRevenue)}</span>
              <span>Locations: {selectedLocations.length}/{getAvailableLocations().length}</span>
            </div>
          </div>
          
          <div className="table-container">
            <table className="advanced-table">
              <thead>
                <tr>
                  <th>{activeTab === 'daily' ? 'Day' : activeTab === 'monthly' ? 'Month' : 'Year'}</th>
                  <th>Total Revenue</th>
                  <th>Returns</th>
                  <th>Net Revenue</th>
                  <th>Transactions</th>
                  <th>Avg/Transaction</th>
                  <th>Return Rate</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, index) => (
                  <tr key={index} className="table-row">                    <td className="primary-cell">
                      {activeTab === 'daily' && (
                        <div>
                          <strong>{item.day}/{item.month}/{item.year}</strong>
                          <br />
                          <small>{item.dayName}</small>
                        </div>
                      )}
                      {activeTab === 'monthly' && (
                        <div>
                          <strong>{item.yearMonth}</strong>
                        </div>
                      )}
                      {activeTab === 'yearly' && item.year}
                    </td>
                    <td className="currency-cell">{formatCurrency(item.totalRevenue)}</td>
                    <td className="returns-cell">{formatCurrency(item.returns)}</td>
                    <td className="net-cell">{formatCurrency(item.netRevenue)}</td>
                    <td className="number-cell">{formatNumber(item.totalTransactions)}</td>
                    <td className="currency-cell">{formatCurrency(item.avgTransactionValue)}</td>
                    <td className="percentage-cell">{formatPercentage(item.returnRate)}</td>
                    <td className={`growth-cell ${item.growth >= 0 ? 'positive' : 'negative'}`}>
                      {item.growth !== undefined ? (
                        <>
                          {item.growth >= 0 ? '↗️' : '↘️'} {formatPercentage(Math.abs(item.growth))}
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Summary */}
      <div className="reports-footer">
        <div className="footer-content">
          <h4>📊 Analytics Summary</h4>
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="stat-label">Data Points:</span>
              <span className="stat-value">{formatNumber(salesData.length)} records</span>
            </div>            <div className="footer-stat">
              <span className="stat-label">Reporting Period:</span>
              <span className="stat-value">
                {activeTab === 'daily' && selectedYears.length > 0 && selectedMonths.length > 0 && 
                  `${selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Years`} - ${selectedMonths.length === 1 ? new Date(2025, parseInt(selectedMonths[0]) - 1, 1).toLocaleString('default', { month: 'long' }) : `${selectedMonths.length} Months`}`}
                {activeTab === 'monthly' && selectedYears.length > 0 && 
                  (selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Years`)}
                {activeTab === 'yearly' && 'All Available Years'}
              </span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Locations:</span>
              <span className="stat-value">
                {selectedLocations.length === getAvailableLocations().length ? 
                  'All Locations' : 
                  `${selectedLocations.length}/${getAvailableLocations().length} Selected`}
              </span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Last Updated:</span>
              <span className="stat-value">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;