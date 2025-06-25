import pandas as pd

# Load and analyze the sales data
df = pd.read_csv('sales.csv')

print('=== RETURNS ANALYSIS ===')
print(f'Total records: {len(df):,}')

# Identify returns vs sales
returns = df[df['INVOICENUMBER'].str.contains('-R', na=False)]
sales = df[~df['INVOICENUMBER'].str.contains('-R', na=False)]

print(f'Return transactions: {len(returns):,}')
print(f'Sales transactions: {len(sales):,}')
print(f'Returns percentage: {(len(returns) / len(df) * 100):.2f}%')

# Financial analysis
total_returns = returns['NETREVENUEAMOUNT'].sum()
total_sales = sales['NETREVENUEAMOUNT'].sum()
net_revenue = total_sales - total_returns

print(f'\n=== FINANCIAL IMPACT ===')
print(f'Total returns amount: ${total_returns:,.2f}')
print(f'Total sales amount: ${total_sales:,.2f}')
print(f'Net revenue (sales - returns): ${net_revenue:,.2f}')
print(f'Return rate: {(total_returns / total_sales * 100):.2f}%')

# Sample return transactions
print(f'\n=== SAMPLE RETURN TRANSACTIONS ===')
sample_returns = returns[['INVOICENUMBER', 'INVOICEDATE', 'PHARMACISTNAME', 'NETREVENUEAMOUNT']].head(10)
print(sample_returns.to_string(index=False))

# Daily analysis example (first few days)
print(f'\n=== DAILY NET REVENUE EXAMPLE (First 3 days) ===')
first_days = df[df['INVOICEDATE'].isin(['01/01/2024', '02/01/2024', '03/01/2024'])]
daily_analysis = first_days.groupby('INVOICEDATE').agg({
    'NETREVENUEAMOUNT': ['sum', 'count'],
    'INVOICENUMBER': lambda x: sum(1 for inv in x if '-R' in str(inv))
}).round(2)
daily_analysis.columns = ['Total_Amount', 'Total_Transactions', 'Return_Transactions']
print(daily_analysis)
