import pandas as pd

# Load the data
df = pd.read_csv('sales.csv')

print("=== ANALYSIS FOR MAY 24, 2025 ===")

# Try both date formats
target_dates = ["24/05/2025", "05/24/2025"]
may24_data = None

for date_format in target_dates:
    data = df[df['INVOICEDATE'] == date_format]
    if len(data) > 0:
        may24_data = data
        print(f"Found data with format: {date_format}")
        print(f"Total transactions: {len(may24_data)}")
        break

if may24_data is not None:
    # Separate sales and returns
    sales_data = may24_data[~may24_data['INVOICENUMBER'].str.contains('-R', na=False)]
    returns_data = may24_data[may24_data['INVOICENUMBER'].str.contains('-R', na=False)]
    
    # Calculate totals
    gross_sales = sales_data['NETREVENUEAMOUNT'].sum()
    total_returns = returns_data['NETREVENUEAMOUNT'].sum()
    net_sales = gross_sales - total_returns
    
    print(f"\n--- FINANCIAL BREAKDOWN ---")
    print(f"Gross Sales: ${gross_sales:,.2f}")
    print(f"Total Returns: ${total_returns:,.2f}")
    print(f"Net Sales: ${net_sales:,.2f}")
    print(f"Net Sales (K format): {net_sales/1000:.2f}K")
    
    print(f"\n--- TRANSACTION BREAKDOWN ---")
    print(f"Sales Transactions: {len(sales_data)}")
    print(f"Return Transactions: {len(returns_data)}")
    
    print(f"\n--- VERIFICATION ---")
    expected_net = 395090  # 395.09K in actual value
    difference = abs(net_sales - expected_net)
    print(f"Expected Net Sales: ${expected_net:,.2f} (395.09K)")
    print(f"Calculated Net Sales: ${net_sales:,.2f}")
    print(f"Difference: ${difference:,.2f}")
    
    if difference < 100:
        print("✅ MATCH: Calculations are correct!")
    else:
        print("❌ MISMATCH: Check calculation logic")

else:
    print("❌ No data found for May 24, 2025")
    print("\nChecking available May 2025 dates...")
    
    # Check what May 2025 dates exist
    all_2025 = df[df['INVOICEDATE'].str.contains('/2025', na=False)]
    may_2025 = all_2025[all_2025['INVOICEDATE'].str.contains('/05/', na=False)]
    
    if len(may_2025) > 0:
        unique_dates = sorted(may_2025['INVOICEDATE'].unique())
        print(f"Found {len(unique_dates)} unique dates in May 2025:")
        for date in unique_dates[:10]:  # Show first 10
            count = len(may_2025[may_2025['INVOICEDATE'] == date])
            print(f"  {date}: {count} transactions")
    else:
        print("No May 2025 data found")
