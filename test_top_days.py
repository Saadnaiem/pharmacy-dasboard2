import pandas as pd
from datetime import datetime

# Load the data
df = pd.read_csv('sales.csv')

print("=== TOP DAY SALES COMPARISON (2024 vs 2025) ===")
print("Analysis: Net Revenue = Sales - Returns (by day)")

# Analyze by year
for year in [2024, 2025]:
    year_data = df[df['INVOICEDATE'].str.contains(f'/{year}')]
    
    print(f"\n--- {year} DATA ---")
    print(f"Total records: {len(year_data):,}")
    
    # Calculate daily net revenue
    daily_stats = {}
    
    for _, row in year_data.iterrows():
        date_str = row['INVOICEDATE']
        invoice_num = str(row['INVOICENUMBER'])
        amount = float(row['NETREVENUEAMOUNT'])
        
        if date_str not in daily_stats:
            daily_stats[date_str] = {
                'gross_sales': 0,
                'returns': 0,
                'net_revenue': 0,
                'sales_count': 0,
                'return_count': 0
            }
        
        if '-R' in invoice_num:
            # Return transaction
            daily_stats[date_str]['returns'] += amount
            daily_stats[date_str]['return_count'] += 1
            daily_stats[date_str]['net_revenue'] -= amount
        else:
            # Sales transaction
            daily_stats[date_str]['gross_sales'] += amount
            daily_stats[date_str]['sales_count'] += 1
            daily_stats[date_str]['net_revenue'] += amount
    
    # Find top day by net revenue
    top_day = max(daily_stats.items(), key=lambda x: x[1]['net_revenue'])
    
    print(f"Top Sales Day: {top_day[0]}")
    print(f"  Net Revenue: ${top_day[1]['net_revenue']:,.2f}")
    print(f"  Gross Sales: ${top_day[1]['gross_sales']:,.2f}")
    print(f"  Returns: ${top_day[1]['returns']:,.2f}")
    print(f"  Sales Transactions: {top_day[1]['sales_count']}")
    print(f"  Return Transactions: {top_day[1]['return_count']}")
    
    # Show top 5 days
    sorted_days = sorted(daily_stats.items(), key=lambda x: x[1]['net_revenue'], reverse=True)[:5]
    print(f"\nTop 5 Days by Net Revenue:")
    for i, (date, stats) in enumerate(sorted_days, 1):
        print(f"  {i}. {date}: ${stats['net_revenue']:,.2f} (Gross: ${stats['gross_sales']:,.2f}, Returns: ${stats['returns']:,.2f})")

print("\n=== RETURNS IMPACT ANALYSIS ===")
total_returns = df[df['INVOICENUMBER'].str.contains('-R', na=False)]
print(f"Total return transactions: {len(total_returns):,}")
print(f"Total return amount: ${total_returns['NETREVENUEAMOUNT'].sum():,.2f}")

# Show days with highest return impact
daily_returns = total_returns.groupby('INVOICEDATE')['NETREVENUEAMOUNT'].sum().sort_values(ascending=False)
print(f"\nTop 5 Days with Highest Returns:")
for i, (date, amount) in enumerate(daily_returns.head().items(), 1):
    print(f"  {i}. {date}: ${amount:,.2f}")
