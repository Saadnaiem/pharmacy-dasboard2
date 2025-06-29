import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// MultiSelect component for multiple selection filters
function MultiSelect({ options, values, onChange, placeholder, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleToggleOption = (optionValue) => {
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
              className={`multi-select-option ${values.includes(option.value) ? 'selected' : ''} ${option.value === 'all' ? 'all-option' : ''}`}
              onClick={e => { e.stopPropagation(); handleToggleOption(option.value); }}
            >
              <span className="multi-select-checkbox">{values.includes(option.value) ? '✓' : ''}</span>
              <span className="multi-select-label">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('daily'); // daily, monthly, yearly
  const [groupBy, setGroupBy] = useState('pharmacist'); // pharmacist, location
  const [tab, setTab] = useState('daily'); // 'daily' or 'pharmacist'

  useEffect(() => {
    setLoading(true);
    axios.get('/api/sales-data')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  // Filters for year, month, location
  const years = useMemo(() => Array.from(new Set(data.map(d => d.Year))).sort(), [data]);
  const months = useMemo(() => Array.from(new Set(data.map(d => d.Month))).sort((a, b) => a - b), [data]);
  const locations = useMemo(() => Array.from(new Set(data.map(d => d.LOCATIONNAME || 'Unknown'))).sort(), [data]);
  const [selectedYear, setSelectedYear] = useState(years[0] || '');
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '');
  const [selectedLocation, setSelectedLocation] = useState('all');
  // For calendar day filter
  const [selectedDay, setSelectedDay] = useState('all');

  // Multi-select filter states for Daily Report
  const [dailySelectedYears, setDailySelectedYears] = useState(['all']);
  const [dailySelectedMonths, setDailySelectedMonths] = useState(['all']);
  const [dailySelectedLocations, setDailySelectedLocations] = useState(['all']);
  const [dailySelectedDays, setDailySelectedDays] = useState(['all']);

  // Multi-select filter states
  const [selectedYears, setSelectedYears] = useState(['all']);
  const [selectedMonths, setSelectedMonths] = useState(['all']);
  const [selectedLocations, setSelectedLocations] = useState(['all']);

  // Unique pharmacist names for filter
  const pharmacistNames = useMemo(() => {
    const namesSet = new Set();
    data.forEach(d => {
      let name = d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown';
      name = name.split(' ').slice(0, 2).join(' ');
      namesSet.add(name);
    });
    return Array.from(namesSet).sort();
  }, [data]);
  const pharmacistNameOptions = useMemo(() => pharmacistNames.map(n => ({ value: n, label: n })), [pharmacistNames]);
  const [selectedPharmacistNames, setSelectedPharmacistNames] = useState(['all']);

  // Unique quarters for filter
  const quarters = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      if (d.Month && d.Year) {
        const q = `Q${Math.ceil(d.Month / 3)}-${d.Year}`;
        set.add(q);
      }
    });
    return Array.from(set).sort((a, b) => {
      // Sort by year then quarter
      const [qA, yA] = a.replace('Q','').split('-').map(Number);
      const [qB, yB] = b.replace('Q','').split('-').map(Number);
      return yA - yB || qA - qB;
    });
  }, [data]);
  const quarterOptions = useMemo(() => quarters.map(q => ({ value: q, label: q })), [quarters]);
  const [selectedQuarters, setSelectedQuarters] = useState(['all']);

  useEffect(() => {
    if (years.length && !selectedYear) setSelectedYear(years[0]);
    if (months.length && !selectedMonth) setSelectedMonth(months[0]);
  }, [years, months]);

  // Unique options for filters
  const yearOptions = useMemo(() => years.map(y => ({ value: y, label: y })), [years]);
  const monthOptions = useMemo(() => months.map(m => ({ value: m, label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1] })), [months]);
  const locationOptions = useMemo(() => locations.map(l => ({ value: l, label: l })), [locations]);

  // Compute all days in selected month(s) for daily report
  const allDaysInSelectedMonths = useMemo(() => {
    let daysSet = new Set();
    let monthsToCheck = dailySelectedMonths.includes('all') ? months : dailySelectedMonths;
    let yearsToCheck = dailySelectedYears.includes('all') ? years : dailySelectedYears;
    monthsToCheck.forEach(m => {
      yearsToCheck.forEach(y => {
        if (m && y) {
          const daysInMonth = new Date(y, m, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) daysSet.add(`${y}-${m}-${d}`);
        }
      });
    });
    return Array.from(daysSet).map(str => {
      const [y, m, d] = str.split('-').map(Number);
      return { year: y, month: m, day: d };
    }).sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
  }, [dailySelectedMonths, dailySelectedYears, months, years]);

  // Filter data for selected years, months, locations, days
  const dailyFiltered = useMemo(() => {
    return data.filter(d =>
      (dailySelectedYears.includes('all') || dailySelectedYears.includes(d.Year)) &&
      (dailySelectedMonths.includes('all') || dailySelectedMonths.includes(d.Month)) &&
      (dailySelectedLocations.includes('all') || dailySelectedLocations.includes(d.LOCATIONNAME || 'Unknown')) &&
      (dailySelectedDays.includes('all') || dailySelectedDays.includes(new Date(d.Date).getDate()))
    );
  }, [data, dailySelectedYears, dailySelectedMonths, dailySelectedLocations, dailySelectedDays]);

  // Build table rows for all days in selected month(s)
  const dailyTableRows = useMemo(() => {
    return allDaysInSelectedMonths
      .filter(({ day }) => dailySelectedDays.includes('all') || dailySelectedDays.includes(day))
      .map(({ year, month, day }) => {
        const dayData = dailyFiltered.filter(d => d.Year === year && d.Month === month && new Date(d.Date).getDate() === day);
        const grossSales = dayData.reduce((sum, d) => sum + (Number(d.NetRevenueAmount) > 0 ? Number(d.NetRevenueAmount) : 0), 0);
        const grossTransactions = dayData.filter(d => Number(d.NetRevenueAmount) > 0).length;
        const returnsValue = dayData.reduce((sum, d) => sum + (Number(d.NetRevenueAmount) < 0 ? Number(d.NetRevenueAmount) : 0), 0);
        const returnsCount = dayData.filter(d => Number(d.NetRevenueAmount) < 0).length;
        const netRevenue = grossSales + returnsValue;
        const netTransactions = grossTransactions - returnsCount;
        return {
          year, month, day,
          grossSales: Number(grossSales.toFixed(3)),
          grossTransactions,
          returnsValue: Number(returnsValue.toFixed(3)),
          returnsCount,
          netRevenue: Number(netRevenue.toFixed(3)),
          netTransactions,
        };
      });
  }, [allDaysInSelectedMonths, dailyFiltered, dailySelectedDays]);

  // For daily day filter dropdown
  const dailyDayOptions = useMemo(() => {
    const daysSet = new Set(allDaysInSelectedMonths.map(({ day }) => day));
    return Array.from(daysSet).sort((a, b) => a - b).map(d => ({ value: d, label: d }));
  }, [allDaysInSelectedMonths]);

  // Filter data for selected year, month, location, and day
  const filtered = useMemo(() => {
    return data.filter(d =>
      (!selectedYear || d.Year === selectedYear) &&
      (!selectedMonth || d.Month === selectedMonth) &&
      (selectedLocation === 'all' || (d.LOCATIONNAME || 'Unknown') === selectedLocation) &&
      (selectedDay === 'all' || new Date(d.Date).getDate() === Number(selectedDay))
    );
  }, [data, selectedYear, selectedMonth, selectedLocation, selectedDay]);

  // Get all days in the selected month
  const daysInMonth = useMemo(() => {
    const set = new Set(filtered.map(d => new Date(d.Date).getDate()));
    return Array.from(set).sort((a, b) => a - b);
  }, [filtered]);

  // Build table rows: each row is a day, columns are gross sales, gross transactions, returns value, returns count, net revenue, net transactions
  const tableRows = useMemo(() => {
    return daysInMonth.map(day => {
      const dayData = filtered.filter(d => new Date(d.Date).getDate() === day);
      const grossSales = dayData.reduce((sum, d) => sum + (Number(d.NetRevenueAmount) > 0 ? Number(d.NetRevenueAmount) : 0), 0);
      const grossTransactions = dayData.filter(d => Number(d.NetRevenueAmount) > 0).length;
      const returnsValue = dayData.reduce((sum, d) => sum + (Number(d.NetRevenueAmount) < 0 ? Number(d.NetRevenueAmount) : 0), 0);
      const returnsCount = dayData.filter(d => Number(d.NetRevenueAmount) < 0).length;
      const netRevenue = grossSales + returnsValue;
      // Net Transactions = Gross Transactions - Returns Count
      const netTransactions = grossTransactions - returnsCount;
      return {
        day,
        grossSales: Number(grossSales.toFixed(3)),
        grossTransactions,
        returnsValue: Number(returnsValue.toFixed(3)),
        returnsCount,
        netRevenue: Number(netRevenue.toFixed(3)),
        netTransactions,
      };
    });
  }, [filtered, daysInMonth]);

  // Find top day by Net Revenue and Net Transactions
  const topNetRevenue = Math.max(...tableRows.map(r => r.netRevenue));
  const topNetTransactions = Math.max(...tableRows.map(r => r.netTransactions));

  // Find top day by Gross Sales (for selected month)
  const topGrossSales = useMemo(() => {
    if (!filtered.length) return null;
    // Group by day
    const dayMap = {};
    filtered.forEach(d => {
      const day = new Date(d.Date).getDate();
      if (!dayMap[day]) dayMap[day] = 0;
      // Only count positive NetRevenueAmount as sales
      if (Number(d.NetRevenueAmount) > 0) {
        dayMap[day] += Number(d.NetRevenueAmount);
      }
    });
    // Find the day with the max sales
    let maxDay = null;
    let maxValue = -Infinity;
    Object.entries(dayMap).forEach(([day, value]) => {
      if (value > maxValue) {
        maxValue = value;
        maxDay = day;
      }
    });
    return { day: maxDay, value: maxValue };
  }, [filtered]);

  // Format number with commas and 2 decimals
  const formatNumber = (num) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Format integer with commas only
  const formatInteger = (num) => num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  // Remove currency symbol from formatNumber for table values
  const formatNumberNoCurrency = (num) => Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Helper: should show year comparison table?
  const showYearComparison = useMemo(() => {
    return selectedYears.includes('all') && (
      !selectedQuarters.includes('all') ||
      !selectedMonths.includes('all') ||
      !selectedLocations.includes('all') ||
      !selectedPharmacistNames.includes('all')
    );
  }, [selectedYears, selectedQuarters, selectedMonths, selectedLocations, selectedPharmacistNames]);

  // Build year comparison data (Net Revenue, Net Trans, Growth Rate %)
  const yearComparisonRows = useMemo(() => {
    if (!showYearComparison) return [];
    const rows = years.map(year => {
      const filtered = data.filter(d => {
        const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
        const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
        return (
          d.Year === year &&
          (selectedQuarters.includes('all') || selectedQuarters.includes(quarter)) &&
          (selectedMonths.includes('all') || selectedMonths.includes(d.Month)) &&
          (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown')) &&
          (selectedPharmacistNames.includes('all') || selectedPharmacistNames.includes(pharmacistName))
        );
      });
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      filtered.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return {
        year,
        netRevenue,
        netTrans
      };
    });
    // Add growth rate %
    return rows.map((row, idx) => {
      if (idx === 0) return { ...row, growthRate: null };
      const prev = rows[idx - 1];
      const growth = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      return { ...row, growthRate: growth };
    });
  }, [showYearComparison, years, data, selectedQuarters, selectedMonths, selectedLocations, selectedPharmacistNames]);

  // Helper: should show filter comparison table?
  const showFilterComparison = useMemo(() => {
    // Only one year selected, and at least one other filter has multiple selections (not 'all')
    const singleYear = selectedYears.length === 1 && !selectedYears.includes('all');
    const multiQuarter = selectedQuarters.length > 1 && !selectedQuarters.includes('all');
    const multiMonth = selectedMonths.length > 1 && !selectedMonths.includes('all');
    const multiLocation = selectedLocations.length > 1 && !selectedLocations.includes('all');
    const multiPharmacist = selectedPharmacistNames.length > 1 && !selectedPharmacistNames.includes('all');
    return singleYear && (multiPharmacist || multiLocation || multiQuarter || multiMonth);
  }, [selectedYears, selectedQuarters, selectedMonths, selectedLocations, selectedPharmacistNames]);

  // Build filter comparison data
  const filterComparison = useMemo(() => {
    if (!showFilterComparison) return { rows: [], label: '' };
    const year = selectedYears[0];
    // Priority: pharmacist > location > quarter > month
    let filterType = '', filterValues = [], label = '';
    if (selectedPharmacistNames.length > 1 && !selectedPharmacistNames.includes('all')) {
      filterType = 'pharmacist';
      filterValues = selectedPharmacistNames;
      label = 'Pharmacist';
    } else if (selectedLocations.length > 1 && !selectedLocations.includes('all')) {
      filterType = 'location';
      filterValues = selectedLocations;
      label = 'Location';
    } else if (selectedQuarters.length > 1 && !selectedQuarters.includes('all')) {
      filterType = 'quarter';
      filterValues = selectedQuarters;
      label = 'Quarter';
    } else if (selectedMonths.length > 1 && !selectedMonths.includes('all')) {
      filterType = 'month';
      filterValues = selectedMonths;
      label = 'Month';
    }
    // Build rows
    const rows = filterValues.map((val, idx) => {
      const filtered = data.filter(d => {
        const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
        const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
        return (
          d.Year === year &&
          (filterType !== 'pharmacist' || pharmacistName === val) &&
          (filterType !== 'location' || (d.LOCATIONNAME || 'Unknown') === val) &&
          (filterType !== 'quarter' || quarter === val) &&
          (filterType !== 'month' || d.Month === val)
        );
      });
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      filtered.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return {
        key: val,
        netRevenue,
        netTrans
      };
    });
    // Add growth rate % if possible (for ordered filters: month, quarter)
    if (filterType === 'month' || filterType === 'quarter') {
      rows.sort((a, b) => {
        if (filterType === 'month') return a.key - b.key;
        // For quarter: Q1-2024, Q2-2024, ...
        const [qa, ya] = a.key.replace('Q','').split('-').map(Number);
        const [qb, yb] = b.key.replace('Q','').split('-').map(Number);
        return ya - yb || qa - qb;
      });
      rows.forEach((row, idx) => {
        if (idx === 0) row.growthRate = null;
        else {
          const prev = rows[idx - 1];
          row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
        }
      });
    }
    return { rows, label };
  }, [showFilterComparison, selectedYears, selectedQuarters, selectedMonths, selectedLocations, selectedPharmacistNames, data]);

  // --- Pharmacist-specific comparison tables ---
  const showPharmacistComparisons = useMemo(() => {
    // Only one pharmacist selected, not 'all'
    return selectedPharmacistNames.length === 1 && !selectedPharmacistNames.includes('all');
  }, [selectedPharmacistNames]);

  // Year comparison for selected pharmacist
  const pharmacistYearComparisonRows = useMemo(() => {
    if (!showPharmacistComparisons) return [];
    return years.map(year => {
      const filtered = data.filter(d => {
        const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
        const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
        return (
          d.Year === year &&
          pharmacistName === selectedPharmacistNames[0] &&
          (selectedQuarters.includes('all') || selectedQuarters.includes(quarter)) &&
          (selectedMonths.includes('all') || selectedMonths.includes(d.Month)) &&
          (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown'))
        );
      });
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      filtered.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return {
        year,
        netRevenue,
        netTrans
      };
    }).map((row, idx, arr) => {
      if (idx === 0) return { ...row, growthRate: null };
      const prev = arr[idx - 1];
      const growth = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      return { ...row, growthRate: growth };
    });
  }, [showPharmacistComparisons, years, data, selectedPharmacistNames, selectedQuarters, selectedMonths, selectedLocations]);

  // Quarter comparison for selected pharmacist (in selected year(s))
  const pharmacistQuarterComparisonRows = useMemo(() => {
    if (!showPharmacistComparisons) return [];
    // Get all quarters for selected years
    let quartersList = [];
    years.forEach(year => {
      [1,2,3,4].forEach(q => {
        quartersList.push(`Q${q}-${year}`);
      });
    });
    // Filter by selected years
    if (!selectedYears.includes('all')) {
      quartersList = quartersList.filter(q => selectedYears.includes(Number(q.split('-')[1])));
    }
    // If user has selected specific quarters, further filter
    if (!selectedQuarters.includes('all')) {
      quartersList = quartersList.filter(q => selectedQuarters.includes(q));
    }
    // Remove quarters not present in data
    const dataQuarters = new Set(data.map(d => d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : ''));
    quartersList = quartersList.filter(q => dataQuarters.has(q));
    // Build rows
    const rows = quartersList.map(q => {
      const [qNum, yNum] = q.replace('Q','').split('-').map(Number);
      const filtered = data.filter(d => {
        const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
        const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
        return (
          quarter === q &&
          pharmacistName === selectedPharmacistNames[0] &&
          (selectedMonths.includes('all') || selectedMonths.includes(d.Month)) &&
          (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown'))
        );
      });
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      filtered.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return {
        key: q,
        netRevenue,
        netTrans
      };
    });
    // Sort and add growth rate
    rows.sort((a, b) => {
      const [qa, ya] = a.key.replace('Q','').split('-').map(Number);
      const [qb, yb] = b.key.replace('Q','').split('-').map(Number);
      return ya - yb || qa - qb;
    });
    rows.forEach((row, idx) => {
      if (idx === 0) row.growthRate = null;
      else {
        const prev = rows[idx - 1];
        row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      }
    });
    return rows;
  }, [showPharmacistComparisons, years, data, selectedPharmacistNames, selectedYears, selectedQuarters, selectedMonths, selectedLocations]);

  // Month comparison for selected pharmacist (in selected year(s))
  const pharmacistMonthComparisonRows = useMemo(() => {
    if (!showPharmacistComparisons) return [];
    // Get all months for selected years
    let monthsList = [];
    years.forEach(year => {
      months.forEach(m => {
        monthsList.push({ month: m, year });
      });
    });
    // Filter by selected years
    if (!selectedYears.includes('all')) {
      monthsList = monthsList.filter(obj => selectedYears.includes(obj.year));
    }
    // If user has selected specific months, further filter
    if (!selectedMonths.includes('all')) {
      monthsList = monthsList.filter(obj => selectedMonths.includes(obj.month));
    }
    // Remove months not present in data
    const dataMonths = new Set(data.map(d => `${d.Month}-${d.Year}`));
    monthsList = monthsList.filter(obj => dataMonths.has(`${obj.month}-${obj.year}`));
    // Build rows
    const rows = monthsList.map(({ month, year }) => {
      const filtered = data.filter(d => {
        const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
        return (
          d.Month === month &&
          d.Year === year &&
          pharmacistName === selectedPharmacistNames[0] &&
          (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown'))
        );
      });
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      filtered.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return {
        key: `${month}-${year}`,
        month,
        year,
        netRevenue,
        netTrans
      };
    });
    // Sort and add growth rate
    rows.sort((a, b) => a.year - b.year || a.month - b.month);
    rows.forEach((row, idx) => {
      if (idx === 0) row.growthRate = null;
      else {
        const prev = rows[idx - 1];
        row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      }
    });
    return rows;
  }, [showPharmacistComparisons, years, months, data, selectedPharmacistNames, selectedYears, selectedMonths, selectedLocations]);

  // Helper: should show single pharmacist advanced comparison?
  const showSinglePharmacistComparison = useMemo(() => {
    return selectedPharmacistNames.length === 1 && !selectedPharmacistNames.includes('all');
  }, [selectedPharmacistNames]);

  // Build single pharmacist comparison tables (year, quarter, month)
  const singlePharmacistComparisons = useMemo(() => {
    if (!showSinglePharmacistComparison) return { yearRows: [], quarterRows: [], monthRows: [], pharmacist: null };
    const pharmacist = selectedPharmacistNames[0];
    // Filter data for this pharmacist and other selected filters
    const filteredData = data.filter(d => {
      const name = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
      const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
      return (
        name === pharmacist &&
        (selectedYears.includes('all') || selectedYears.includes(d.Year)) &&
        (selectedQuarters.includes('all') || selectedQuarters.includes(quarter)) &&
        (selectedMonths.includes('all') || selectedMonths.includes(d.Month)) &&
        (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown'))
      );
    });
    // Year comparison
    const yearSet = new Set(filteredData.map(d => d.Year));
    const yearRows = Array.from(yearSet).sort().map(year => {
      const rows = filteredData.filter(d => d.Year === year);
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      rows.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return { key: year, netRevenue, netTrans };
    });
    yearRows.sort((a, b) => a.key - b.key);
    yearRows.forEach((row, idx) => {
      if (idx === 0) row.growthRate = null;
      else {
        const prev = yearRows[idx - 1];
        row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      }
    });
    // Quarter comparison
    const quarterSet = new Set(filteredData.map(d => d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : ''));
    const quarterRows = Array.from(quarterSet).filter(q => q).sort((a, b) => {
      const [qa, ya] = a.replace('Q','').split('-').map(Number);
      const [qb, yb] = b.replace('Q','').split('-').map(Number);
      return ya - yb || qa - qb;
    }).map(q => {
      const [qNum, yNum] = q.replace('Q','').split('-').map(Number);
      const rows = filteredData.filter(d => d.Year === yNum && Math.ceil(d.Month / 3) === qNum);
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      rows.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return { key: q, netRevenue, netTrans };
    });
    quarterRows.forEach((row, idx) => {
      if (idx === 0) row.growthRate = null;
      else {
        const prev = quarterRows[idx - 1];
        row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      }
    });
    // Month comparison
    const monthSet = new Set(filteredData.map(d => d.Month));
    const monthRows = Array.from(monthSet).filter(m => m).sort((a, b) => a - b).map(m => {
      const rows = filteredData.filter(d => d.Month === m);
      let netRevenue = 0, netTrans = 0, grossRevenue = 0, grossTrans = 0, returnsValue = 0, returnsCount = 0;
      rows.forEach(d => {
        const amount = Number(d.NetRevenueAmount);
        if (amount > 0) {
          grossRevenue += amount;
          grossTrans += 1;
        } else if (amount < 0) {
          returnsValue += amount;
          returnsCount += 1;
        }
      });
      netRevenue = grossRevenue + returnsValue;
      netTrans = grossTrans - returnsCount;
      return { key: m, netRevenue, netTrans };
    });
    monthRows.forEach((row, idx) => {
      if (idx === 0) row.growthRate = null;
      else {
        const prev = monthRows[idx - 1];
        row.growthRate = prev.netRevenue !== 0 ? ((row.netRevenue - prev.netRevenue) / Math.abs(prev.netRevenue)) * 100 : null;
      }
    });
    return { yearRows, quarterRows, monthRows, pharmacist };
  }, [showSinglePharmacistComparison, selectedPharmacistNames, selectedYears, selectedQuarters, selectedMonths, selectedLocations, data]);

  return (
    <div className="reports-page">
      <div className="tab-controls">
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          <span className="tab-icon" role="img" aria-label="Daily">📅</span> Daily Report
        </button>
        <button className={tab === 'pharmacist' ? 'active' : ''} onClick={() => setTab('pharmacist')}>
          <span className="tab-icon" role="img" aria-label="Pharmacist">👨‍⚕️</span> Pharmacist Report
        </button>
      </div>
      {tab === 'daily' && (
        <>
          <h2 className="main-title">Daily Sales & Transactions Report</h2>
          <div className="reports-controls">
            <MultiSelect options={yearOptions} values={dailySelectedYears} onChange={setDailySelectedYears} placeholder="All Years" label="Year" />
            <MultiSelect options={monthOptions} values={dailySelectedMonths} onChange={setDailySelectedMonths} placeholder="All Months" label="Month" />
            <MultiSelect options={locationOptions} values={dailySelectedLocations} onChange={setDailySelectedLocations} placeholder="All Locations" label="Location" />
            <MultiSelect options={dailyDayOptions} values={dailySelectedDays} onChange={setDailySelectedDays} placeholder="All Days" label="Day" />
            <button className="clear-filters-btn" onClick={() => { setDailySelectedYears(['all']); setDailySelectedMonths(['all']); setDailySelectedLocations(['all']); setDailySelectedDays(['all']); }}>Clear Filters</button>
          </div>
          {loading ? <div className="loading">Loading...</div> : error ? <div className="error">{error}</div> : (
            <div className="reports-table-section">
              <h3>Daily Sales and Transactions</h3>
              <div className="reports-table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Gross Revenue</th>
                      <th>Gross Trans</th>
                      <th>Returns Value</th>
                      <th>Returns Count</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTableRows.map((row, i) => {
                      // Calculate color intensity for Net Revenue and Net Transactions
                      const minNetRevenue = Math.min(...dailyTableRows.map(r => r.netRevenue));
                      const maxNetRevenue = Math.max(...dailyTableRows.map(r => r.netRevenue));
                      const minNetTransactions = Math.min(...dailyTableRows.map(r => r.netTransactions));
                      const maxNetTransactions = Math.max(...dailyTableRows.map(r => r.netTransactions));
                      // Normalize values between 0 and 1
                      const netRevenueNorm = maxNetRevenue !== minNetRevenue ? (row.netRevenue - minNetRevenue) / (maxNetRevenue - minNetRevenue) : 0.5;
                      const netTransactionsNorm = maxNetTransactions !== minNetTransactions ? (row.netTransactions - minNetTransactions) / (maxNetTransactions - minNetTransactions) : 0.5;
                      // Bar width and color
                      const netRevenueBarStyle = {
                        background: `linear-gradient(90deg, #3b82f6 ${Math.round(netRevenueNorm*100)}%, transparent 0%)`,
                        borderRadius: '6px',
                        minWidth: '60px',
                        position: 'relative',
                      };
                      const netTransactionsBarStyle = {
                        background: `linear-gradient(90deg, #22c55e ${Math.round(netTransactionsNorm*100)}%, transparent 0%)`,
                        borderRadius: '6px',
                        minWidth: '60px',
                        position: 'relative',
                      };
                      // Trophy/star for top days
                      const isTopNetRevenue = row.netRevenue === maxNetRevenue;
                      const isTopNetTransactions = row.netTransactions === maxNetTransactions;
                      return (
                        <tr key={i}>
                          <td>{row.day} <span style={{color:'#aaa', fontSize:'0.95em'}}>({new Date(row.year, row.month-1, row.day).toLocaleDateString(undefined, { weekday: 'short' })})</span></td>
                          <td className={row.grossSales >= 0 ? 'positive' : 'negative'}>{formatNumber(row.grossSales)}</td>
                          <td>{formatInteger(row.grossTransactions)}</td>
                          <td className={row.returnsValue < 0 ? 'negative' : 'positive'}>{formatNumber(row.returnsValue)}</td>
                          <td>{formatNumber(row.returnsCount)}</td>
                          <td className={row.netRevenue >= 0 ? 'net-revenue-value' : 'net-revenue-value negative'}>
                            <div className="bar-cell" style={netRevenueBarStyle} title={isTopNetRevenue ? 'Top Net Revenue Day' : ''}>
                              {formatNumber(row.netRevenue)} {isTopNetRevenue && <span className="trophy-icon" title="Top Net Revenue">🏆</span>}
                            </div>
                          </td>
                          <td>
                            <div className="bar-cell" style={netTransactionsBarStyle} title={isTopNetTransactions ? 'Top Net Transactions Day' : ''}>
                              {formatInteger(row.netTransactions)} {isTopNetTransactions && <span className="star-icon" title="Top Net Transactions">⭐</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals row for all columns */}
                    <tr className="totals-row">
                      <td><strong>Total</strong></td>
                      <td><strong>{formatNumber(dailyTableRows.reduce((sum, r) => sum + r.grossSales, 0))}</strong></td>
                      <td><strong>{formatInteger(dailyTableRows.reduce((sum, r) => sum + r.grossTransactions, 0))}</strong></td>
                      <td><strong>{formatNumber(dailyTableRows.reduce((sum, r) => sum + r.returnsValue, 0))}</strong></td>
                      <td><strong>{formatNumber(dailyTableRows.reduce((sum, r) => sum + r.returnsCount, 0))}</strong></td>
                      <td><strong>{formatNumber(dailyTableRows.reduce((sum, r) => sum + r.netRevenue, 0))}</strong></td>
                      <td><strong>{formatInteger(dailyTableRows.reduce((sum, r) => sum + r.netTransactions, 0))}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {tab === 'pharmacist' && (
        <>
          <h2 className="main-title">Pharmacist Performance Report</h2>
          <div className="reports-controls">
            <MultiSelect options={yearOptions} values={selectedYears} onChange={setSelectedYears} placeholder="All Years" label="Year" />
            <MultiSelect options={quarterOptions} values={selectedQuarters} onChange={setSelectedQuarters} placeholder="All Quarters" label="Quarter" />
            <MultiSelect options={monthOptions} values={selectedMonths} onChange={setSelectedMonths} placeholder="All Months" label="Month" />
            <MultiSelect options={locationOptions} values={selectedLocations} onChange={setSelectedLocations} placeholder="All Locations" label="Location" />
            <MultiSelect options={pharmacistNameOptions} values={selectedPharmacistNames} onChange={setSelectedPharmacistNames} placeholder="All Pharmacists" label="Pharmacist" />
            <button className="clear-filters-btn" onClick={() => { setSelectedYears(['all']); setSelectedQuarters(['all']); setSelectedMonths(['all']); setSelectedLocations(['all']); setSelectedPharmacistNames(['all']); }}>Clear Filters</button>
          </div>
          {/* Show single pharmacist comparison tables if only one pharmacist selected */}
          {showSinglePharmacistComparison && (
            <>
              {/* Year Comparison Table */}
              {singlePharmacistComparisons.yearRows.length > 0 && (
                <div className="year-comparison-table-section">
                  <h3>Year Comparison ({singlePharmacistComparisons.pharmacist})</h3>
                  <div className="pharmacist-table-container">
                    <table className="pharmacist-performance-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Net Revenue</th>
                          <th>Net Trans</th>
                          <th>Growth Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singlePharmacistComparisons.yearRows.map(row => (
                          <tr key={row.key}>
                            <td><strong>{row.key}</strong></td>
                            <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                            <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                            <td className="growth-rate-cell">
                              {row.growthRate === null ? '—' : (
                                <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                                  {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Quarter Comparison Table */}
              {singlePharmacistComparisons.quarterRows.length > 0 && (
                <div className="year-comparison-table-section">
                  <h3>Quarter Comparison ({singlePharmacistComparisons.pharmacist})</h3>
                  <div className="pharmacist-table-container">
                    <table className="pharmacist-performance-table">
                      <thead>
                        <tr>
                          <th>Quarter</th>
                          <th>Net Revenue</th>
                          <th>Net Trans</th>
                          <th>Growth Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singlePharmacistComparisons.quarterRows.map(row => (
                          <tr key={row.key}>
                            <td><strong>{row.key}</strong></td>
                            <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                            <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                            <td className="growth-rate-cell">
                              {row.growthRate === null ? '—' : (
                                <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                                  {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Month Comparison Table */}
              {singlePharmacistComparisons.monthRows.length > 0 && (
                <div className="year-comparison-table-section">
                  <h3>Month Comparison ({singlePharmacistComparisons.pharmacist})</h3>
                  <div className="pharmacist-table-container">
                    <table className="pharmacist-performance-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Net Revenue</th>
                          <th>Net Trans</th>
                          <th>Growth Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singlePharmacistComparisons.monthRows.map(row => (
                          <tr key={row.key}>
                            <td><strong>{monthOptions.find(m => m.value === row.key)?.label || row.key}</strong></td>
                            <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                            <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                            <td className="growth-rate-cell">
                              {row.growthRate === null ? '—' : (
                                <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                                  {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          {/* Always show comparison tables above the main table */}
          {showYearComparison && yearComparisonRows.length > 0 && (
            <div className="year-comparison-table-section">
              <h3>Year Comparison</h3>
              <div className="pharmacist-table-container">
                <table className="pharmacist-performance-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                      <th>Growth Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearComparisonRows.map((row, idx) => (
                      <tr key={row.year}>
                        <td><strong>{row.year}</strong></td>
                        <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                        <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                        <td className="growth-rate-cell">
                          {row.growthRate === null ? '—' : (
                            <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                              {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {showFilterComparison && filterComparison.rows.length > 0 && (
            <div className="year-comparison-table-section">
              <h3>{filterComparison.label} Comparison ({selectedYears[0]})</h3>
              <div className="pharmacist-table-container">
                <table className="pharmacist-performance-table">
                  <thead>
                    <tr>
                      <th>{filterComparison.label}</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                      {filterComparison.label === 'Month' || filterComparison.label === 'Quarter' ? <th>Growth Rate %</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filterComparison.rows.map((row, idx) => (
                      <tr key={row.key}>
                        <td><strong>{row.key}</strong></td>
                        <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                        <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                        {(filterComparison.label === 'Month' || filterComparison.label === 'Quarter') && (
                          <td className="growth-rate-cell">
                            {row.growthRate === null ? '—' : (
                              <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                                {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Main pharmacist table always below comparison tables */}
          <div className="pharmacist-performance-card">
            <div className="table-header-section">
              <h3>🏆 Pharmacist Rankings</h3>
              <div className="table-subtitle">Performance based on net revenue and transactions</div>
            </div>
            <div className="pharmacist-table-container">
              <table className="pharmacist-performance-table">
                <thead>
                  <tr>
                    <th className="rank-header">Rank</th>
                    <th className="name-header">Pharmacist Name</th>
                    <th className="revenue-header">Gross Revenue</th>
                    <th className="transactions-header">Gross Trans</th>
                    <th className="returns-header">Returns Value</th>
                    <th className="returns-count-header">Returns Count</th>
                    <th className="net-revenue-header">Net Revenue</th>
                    <th className="net-trans-header">Net Trans</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const pharmacistFiltered = data.filter(d => {
                      const pharmacistName = (d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown').split(' ').slice(0, 2).join(' ');
                      const quarter = d.Month && d.Year ? `Q${Math.ceil(d.Month / 3)}-${d.Year}` : '';
                      return (
                        (selectedYears.includes('all') || selectedYears.includes(d.Year)) &&
                        (selectedQuarters.includes('all') || selectedQuarters.includes(quarter)) &&
                        (selectedMonths.includes('all') || selectedMonths.includes(d.Month)) &&
                        (selectedLocations.includes('all') || selectedLocations.includes(d.LOCATIONNAME || 'Unknown')) &&
                        (selectedPharmacistNames.includes('all') || selectedPharmacistNames.includes(pharmacistName))
                      );
                    });
                    const stats = {};
                    pharmacistFiltered.forEach(d => {
                      let name = d.PharmacistName || d.Pharmacist || d.PHARMACISTNAME || 'Unknown';
                      name = name.split(' ').slice(0, 2).join(' ');
                      if (!stats[name]) stats[name] = { name, grossRevenue: 0, grossTrans: 0, returnsValue: 0, returnsCount: 0, netRevenue: 0, netTrans: 0 };
                      const amount = Number(d.NetRevenueAmount);
                      if (amount > 0) {
                        stats[name].grossRevenue += amount;
                        stats[name].grossTrans += 1;
                      } else if (amount < 0) {
                        stats[name].returnsValue += amount;
                        stats[name].returnsCount += 1;
                      }
                      // Net Revenue and Net Trans
                      stats[name].netRevenue = stats[name].grossRevenue + stats[name].returnsValue;
                      stats[name].netTrans = stats[name].grossTrans - stats[name].returnsCount;
                    });
                    const sorted = Object.values(stats).sort((a, b) => b.netRevenue - a.netRevenue);
                    // Calculate totals
                    const totals = sorted.reduce((acc, ph) => {
                      acc.grossRevenue += ph.grossRevenue;
                      acc.grossTrans += ph.grossTrans;
                      acc.returnsValue += ph.returnsValue;
                      acc.returnsCount += ph.returnsCount;
                      acc.netRevenue += ph.netRevenue;
                      acc.netTrans += ph.netTrans;
                      return acc;
                    }, {grossRevenue: 0, grossTrans: 0, returnsValue: 0, returnsCount: 0, netRevenue: 0, netTrans: 0});
                    return (
                      <>
                        {sorted.map((ph, i) => (
                          <tr key={ph.name} className={`pharmacist-row ${i < 3 ? `top-performer-${i + 1}` : ''}`}> 
                            <td className="rank-cell"><div className="rank-badge rank-number">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div></td>
                            <td className="name-cell"><div className="pharmacist-info"><span className="pharmacist-name">{ph.name}</span><span className="pharmacist-status">{i < 3 ? '🌟 Top Performer' : 'Active'}</span></div></td>
                            <td className="revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(ph.grossRevenue)}</span></td>
                            <td className="transactions-cell"><span className="transactions-value">{formatInteger(ph.grossTrans)}</span></td>
                            <td className="returns-cell"><span className="returns-value">{formatNumberNoCurrency(ph.returnsValue)}</span></td>
                            <td className="returns-count-cell"><span className="returns-count-value">{formatInteger(ph.returnsCount)}</span></td>
                            <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(ph.netRevenue)}</span></td>
                            <td className="net-trans-cell"><span className="transactions-value">{formatInteger(ph.netTrans)}</span></td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="totals-row">
                          <td colSpan={2}><strong>Total</strong></td>
                          <td><strong>{formatNumberNoCurrency(totals.grossRevenue)}</strong></td>
                          <td><strong>{formatInteger(totals.grossTrans)}</strong></td>
                          <td><strong>{formatNumberNoCurrency(totals.returnsValue)}</strong></td>
                          <td><strong>{formatInteger(totals.returnsCount)}</strong></td>
                          <td><strong>{formatNumberNoCurrency(totals.netRevenue)}</strong></td>
                          <td><strong>{formatInteger(totals.netTrans)}</strong></td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          {/* Always show comparison tables above the main table */}
          {showPharmacistComparisons && pharmacistYearComparisonRows.length > 0 && (
            <div className="year-comparison-table-section">
              <h3>Year Comparison ({selectedPharmacistNames[0]})</h3>
              <div className="pharmacist-table-container">
                <table className="pharmacist-performance-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                      <th>Growth Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacistYearComparisonRows.map((row, idx) => (
                      <tr key={row.year}>
                        <td><strong>{row.year}</strong></td>
                        <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                        <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                        <td className="growth-rate-cell">
                          {row.growthRate === null ? '—' : (
                            <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                              {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {showPharmacistComparisons && pharmacistQuarterComparisonRows.length > 0 && (
            <div className="year-comparison-table-section">
              <h3>Quarter Comparison ({selectedPharmacistNames[0]})</h3>
              <div className="pharmacist-table-container">
                <table className="pharmacist-performance-table">
                  <thead>
                    <tr>
                      <th>Quarter</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                      <th>Growth Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacistQuarterComparisonRows.map((row, idx) => (
                      <tr key={row.key}>
                        <td><strong>{row.key}</strong></td>
                        <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                        <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                        <td className="growth-rate-cell">
                          {row.growthRate === null ? '—' : (
                            <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                              {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {showPharmacistComparisons && pharmacistMonthComparisonRows.length > 0 && (
            <div className="year-comparison-table-section">
              <h3>Month Comparison ({selectedPharmacistNames[0]})</h3>
              <div className="pharmacist-table-container">
                <table className="pharmacist-performance-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Year</th>
                      <th>Net Revenue</th>
                      <th>Net Trans</th>
                      <th>Growth Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacistMonthComparisonRows.map((row, idx) => (
                      <tr key={row.key}>
                        <td><strong>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][row.month-1]}</strong></td>
                        <td><strong>{row.year}</strong></td>
                        <td className="net-revenue-cell"><span className="revenue-amount">{formatNumberNoCurrency(row.netRevenue)}</span></td>
                        <td className="net-trans-cell"><span className="transactions-value">{formatInteger(row.netTrans)}</span></td>
                        <td className="growth-rate-cell">
                          {row.growthRate === null ? '—' : (
                            <span style={{color: row.growthRate > 0 ? '#16a34a' : row.growthRate < 0 ? '#dc2626' : '#222'}}>
                              {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportsPage;
