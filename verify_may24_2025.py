#!/usr/bin/env python3
"""
Verification script for May 24, 2025 calculations to ensure net values are correct
"""

import pandas as pd
import sys
import os

def main():
    try:
        # Load the CSV file
        csv_path = os.path.join(os.path.dirname(__file__), 'sales.csv')
        print(f"Loading data from: {csv_path}")
        
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} total records")
        
        # Convert date column
        df['Date'] = pd.to_datetime(df['INVOICEDATE'], format='%d/%m/%Y', errors='coerce')
        df.dropna(subset=['Date'], inplace=True)
        print(f"After date parsing: {len(df)} records")
        
        # Filter for May 24, 2025
        target_date = pd.to_datetime('2025-05-24')
        may24_data = df[df['Date'] == target_date]
        print(f"\nRecords for May 24, 2025: {len(may24_data)}")
        
        if len(may24_data) == 0:
            print("No data found for May 24, 2025")
            return
        
        # Apply the same logic as backend: negate returns
        print("\n=== BACKEND LOGIC (what frontend receives) ===")
        may24_processed = may24_data.copy()
        return_mask = may24_processed['INVOICENUMBER'].astype(str).str.contains('-R', na=False)
        returns_count = return_mask.sum()
        print(f"Return transactions found: {returns_count}")
        
        # Apply backend logic: negate return amounts
        may24_processed['ProcessedAmount'] = may24_processed.apply(
            lambda row: -row['NETREVENUEAMOUNT'] if '-R' in str(row['INVOICENUMBER']) else row['NETREVENUEAMOUNT'], 
            axis=1
        )
        
        # Calculate net total (what frontend should see)
        net_revenue = may24_processed['ProcessedAmount'].sum()
        sales_transactions = (may24_processed['ProcessedAmount'] > 0).sum()
        return_transactions = (may24_processed['ProcessedAmount'] < 0).sum()
        gross_sales = may24_processed[may24_processed['ProcessedAmount'] > 0]['ProcessedAmount'].sum()
        total_returns = may24_processed[may24_processed['ProcessedAmount'] < 0]['ProcessedAmount'].abs().sum()
        
        print(f"Net Revenue (what frontend should show): {net_revenue:,.2f} ﷼")
        print(f"Gross Sales: {gross_sales:,.2f} ﷼")
        print(f"Total Returns: {total_returns:,.2f} ﷼")
        print(f"Sales Transactions: {sales_transactions}")
        print(f"Return Transactions: {return_transactions}")
        print(f"Net = Gross - Returns: {gross_sales - total_returns:,.2f} ﷼")
        
        # Show sample transactions
        print(f"\n=== Sample Transactions ===")
        sample = may24_processed[['INVOICENUMBER', 'NETREVENUEAMOUNT', 'ProcessedAmount']].head(10)
        print(sample.to_string(index=False))
        
        print(f"\n=== VERIFICATION ===")
        print(f"Expected Top Day Sales value: {net_revenue:,.2f} ﷼")
        print(f"If showing 398.9K, that's likely gross sales: {gross_sales/1000:,.1f}K ﷼")
        print(f"Correct net value should be: {net_revenue/1000:,.1f}K ﷼")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
