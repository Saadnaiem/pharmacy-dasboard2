from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import requests
import io

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Configuration for Google Drive CSV
# You can set this as an environment variable or modify directly
GOOGLE_DRIVE_CSV_URL = os.getenv('GOOGLE_DRIVE_CSV_URL', None)
LOCAL_CSV_PATH = 'sales.csv'

def get_google_drive_download_url(share_url):
    """
    Convert a Google Drive share URL to a direct download URL
    Supports both file/d/ and open?id= formats
    """
    if 'drive.google.com' not in share_url:
        return share_url
    
    # Extract file ID from different Google Drive URL formats
    file_id = None
    
    if '/file/d/' in share_url:
        # Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        file_id = share_url.split('/file/d/')[1].split('/')[0]
    elif 'open?id=' in share_url:
        # Format: https://drive.google.com/open?id=FILE_ID
        file_id = share_url.split('open?id=')[1].split('&')[0]
    elif 'id=' in share_url:
        # Format: https://drive.google.com/uc?id=FILE_ID
        file_id = share_url.split('id=')[1].split('&')[0]
    
    if file_id:
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    
    return share_url

def load_csv_data():
    """
    Load CSV data from Google Drive or local file
    Priority: Google Drive URL > Local file
    """
    print("Loading CSV data...")
    
    # Try Google Drive first if URL is provided
    if GOOGLE_DRIVE_CSV_URL:
        try:
            print(f"Attempting to load from Google Drive: {GOOGLE_DRIVE_CSV_URL}")
            download_url = get_google_drive_download_url(GOOGLE_DRIVE_CSV_URL)
            print(f"Download URL: {download_url}")
            
            # Download the file
            response = requests.get(download_url, timeout=30)
            response.raise_for_status()
            
            # Read CSV from the downloaded content
            csv_content = io.StringIO(response.text)
            df = pd.read_csv(csv_content)
            print(f"✅ Successfully loaded {len(df)} rows from Google Drive")
            return df
            
        except Exception as e:
            print(f"❌ Failed to load from Google Drive: {str(e)}")
            print("Falling back to local file...")
    
    # Fallback to local file
    if os.path.exists(LOCAL_CSV_PATH):
        print(f"Loading from local file: {LOCAL_CSV_PATH}")
        df = pd.read_csv(LOCAL_CSV_PATH)
        print(f"✅ Successfully loaded {len(df)} rows from local file")
        return df
    else:
        raise FileNotFoundError(f"No data source available. Google Drive URL: {GOOGLE_DRIVE_CSV_URL}, Local file exists: {os.path.exists(LOCAL_CSV_PATH)}")

@app.route('/api/sales-data')
def get_sales_data():
    try:
        print("API endpoint called: /api/sales-data")
        
        # Load data from Google Drive or local file
        df = load_csv_data()
        print(f"CSV loaded: {len(df)} rows")
        
        # Log initial data sample
        print("Sample of original data:")
        print(df[['INVOICENUMBER', 'INVOICEDATE', 'NETREVENUEAMOUNT', 'PHARMACISTNAME']].head(3))
          # Handle returned transactions using correct uppercase column names
        original_revenue_sum = df['NETREVENUEAMOUNT'].sum()
        print(f"Original total revenue (before return handling): {original_revenue_sum:,.2f} ﷼")
        
        # Apply return logic: negate revenue for invoices with '-R' in the number
        return_mask = df['INVOICENUMBER'].astype(str).str.contains('-R', na=False)
        returns_count = return_mask.sum()
        print(f"Found {returns_count} return transactions (invoices with '-R')")
        
        df['NETREVENUEAMOUNT'] = df.apply(lambda row: -row['NETREVENUEAMOUNT'] if '-R' in str(row['INVOICENUMBER']) else row['NETREVENUEAMOUNT'], axis=1)
        
        adjusted_revenue_sum = df['NETREVENUEAMOUNT'].sum()
        print(f"Adjusted total revenue (after return handling): {adjusted_revenue_sum:,.2f} ﷼")
        print(f"Revenue difference due to returns: {adjusted_revenue_sum - original_revenue_sum:,.2f} ﷼")# Convert 'INVOICEDATE' column to datetime with correct format (DD/MM/YYYY)
        print("Processing dates...")
        print("Sample date formats from raw data:")
        print(df['INVOICEDATE'].head(10).tolist())
        
        # The CSV uses DD/MM/YYYY format, so we need to specify dayfirst=True
        df['Date'] = pd.to_datetime(df['INVOICEDATE'], format='%d/%m/%Y', errors='coerce')
        
        # Check for any dates that failed to parse
        null_dates_count = df['Date'].isnull().sum()
        print(f"Dates that failed to parse with DD/MM/YYYY format: {null_dates_count:,} out of {len(df):,}")
        
        if null_dates_count > 0:
            print("Sample of failed date parsing:")
            failed_dates = df[df['Date'].isnull()]['INVOICEDATE'].head(10)
            print(failed_dates.tolist())
            
            # Try alternative format for any remaining failed dates
            print("Attempting alternative date parsing for failed dates...")
            failed_mask = df['Date'].isnull()
            df.loc[failed_mask, 'Date'] = pd.to_datetime(
                df.loc[failed_mask, 'INVOICEDATE'], 
                errors='coerce',
                dayfirst=True
            )
            
            # Final count after alternative parsing
            final_null_count = df['Date'].isnull().sum()
            print(f"Final dates that failed to parse: {final_null_count:,} out of {len(df):,}")
        
        # Only drop rows where the date conversion completely failed
        original_count = len(df)
        df.dropna(subset=['Date'], inplace=True)
        print(f"After date filtering: {len(df):,} rows (removed {original_count - len(df):,} rows)")
        
        if len(df) == original_count:
            print("✅ SUCCESS: All dates parsed successfully!")
        elif len(df) > original_count * 0.95:
            print("✅ GOOD: Successfully parsed over 95% of dates")
        else:
            print(f"⚠️ WARNING: Lost {original_count - len(df):,} rows ({(original_count - len(df))/original_count*100:.1f}%) due to date parsing issues!")
        
        # Extract year and month
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
        
        # Ensure numeric columns are properly typed
        df['NETREVENUEAMOUNT'] = pd.to_numeric(df['NETREVENUEAMOUNT'], errors='coerce')
        df['Year'] = df['Year'].astype(int)
        df['Month'] = df['Month'].astype(int)
          # Drop rows with invalid revenue amounts
        df.dropna(subset=['NETREVENUEAMOUNT'], inplace=True)
        print(f"After revenue filtering: {len(df)} rows")
        
        # Additional validation - remove any infinite or extremely large values
        df = df[df['NETREVENUEAMOUNT'].between(-1000000, 1000000)]  # Reasonable range for pharmacy transactions
        print(f"After range validation: {len(df)} rows")
        
        # Log revenue statistics by year
        yearly_stats = df.groupby('Year')['NETREVENUEAMOUNT'].agg(['count', 'sum', 'mean']).round(2)
        print("Revenue statistics by year:")
        print(yearly_stats)
        
        # Log monthly statistics for verification
        monthly_stats = df.groupby(['Year', 'Month'])['NETREVENUEAMOUNT'].agg(['count', 'sum']).round(2)
        print("Sample monthly statistics:")
        print(monthly_stats.head(10))

        # Rename columns to match what the frontend expects
        df.rename(columns={'NETREVENUEAMOUNT': 'NetRevenueAmount', 'PHARMACISTNAME': 'Pharmacist'}, inplace=True)
          # Final validation before sending to frontend
        final_total = df['NetRevenueAmount'].sum()
        print(f"Final total revenue being sent to frontend: {final_total:,.2f} ﷼")
        print(f"Total records being sent: {len(df)}")
        
        print("Data processing complete, returning JSON")
        return df.to_json(orient='records')
        
    except Exception as e:
        print(f"ERROR in get_sales_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "message": "Flask server is running"})

@app.route('/api/config/google-drive-url', methods=['GET'])
def get_google_drive_config():
    """Get current Google Drive URL configuration"""
    return jsonify({
        "google_drive_url": GOOGLE_DRIVE_CSV_URL,
        "has_local_file": os.path.exists(LOCAL_CSV_PATH),
        "data_source": "Google Drive" if GOOGLE_DRIVE_CSV_URL else ("Local File" if os.path.exists(LOCAL_CSV_PATH) else "None")
    })

@app.route('/api/config/google-drive-url', methods=['POST'])
def set_google_drive_config():
    """Set Google Drive URL configuration"""
    global GOOGLE_DRIVE_CSV_URL
    try:
        data = request.get_json()
        new_url = data.get('url', '').strip()
        
        if new_url:
            # Validate that it's a Google Drive URL
            if 'drive.google.com' not in new_url:
                return jsonify({"error": "Invalid Google Drive URL"}), 400
            
            GOOGLE_DRIVE_CSV_URL = new_url
            print(f"Google Drive URL updated to: {new_url}")
            
            # Test the connection
            try:
                test_df = load_csv_data()
                return jsonify({
                    "success": True,
                    "message": f"Google Drive URL updated successfully. Found {len(test_df)} records.",
                    "google_drive_url": GOOGLE_DRIVE_CSV_URL
                })
            except Exception as e:
                return jsonify({"error": f"Failed to load data from new URL: {str(e)}"}), 400
        else:
            GOOGLE_DRIVE_CSV_URL = None
            return jsonify({"success": True, "message": "Google Drive URL cleared. Will use local file."})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/verify-totals')
def verify_totals():
    """Endpoint to verify total calculations without any frontend filtering"""
    try:
        df = load_csv_data()
        
        # Apply same processing as main endpoint
        df['NETREVENUEAMOUNT'] = df.apply(lambda row: -row['NETREVENUEAMOUNT'] if '-R' in str(row['INVOICENUMBER']) else row['NETREVENUEAMOUNT'], axis=1)
        df['Date'] = pd.to_datetime(df['INVOICEDATE'], errors='coerce')
        df.dropna(subset=['Date'], inplace=True)
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
        df['NETREVENUEAMOUNT'] = pd.to_numeric(df['NETREVENUEAMOUNT'], errors='coerce')
        df['Year'] = df['Year'].astype(int)
        df['Month'] = df['Month'].astype(int)
        df.dropna(subset=['NETREVENUEAMOUNT'], inplace=True)
        df = df[df['NETREVENUEAMOUNT'].between(-1000000, 1000000)]
        
        # Calculate totals
        grand_total = df['NETREVENUEAMOUNT'].sum()
        total_count = len(df)
        
        # Year breakdown
        year_breakdown = df.groupby('Year')['NETREVENUEAMOUNT'].agg(['count', 'sum']).to_dict()
        
        return jsonify({
            "grand_total": float(grand_total),
            "total_records": int(total_count),
            "year_breakdown": year_breakdown,
            "sample_records": df[['INVOICENUMBER', 'INVOICEDATE', 'NETREVENUEAMOUNT', 'PHARMACISTNAME']].head(5).to_dict('records')        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve React App in production
@app.route('/')
def serve_react_app():
    """Serve the React frontend"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_react_assets(path):
    """Serve React static assets"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # For client-side routing, return index.html
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    print("Starting Flask server...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Sales.csv exists: {os.path.exists('sales.csv')}")
    
    # Production vs Development configuration
    is_production = os.getenv('FLASK_ENV') == 'production'
    port = int(os.getenv('PORT', 5000))
    
    if is_production:
        print("🚀 Running in PRODUCTION mode")
        print(f"📂 Static folder: {app.static_folder}")
        print(f"🌐 Port: {port}")
        app.run(debug=False, host='0.0.0.0', port=port)
    else:
        print("🔧 Running in DEVELOPMENT mode")
        app.run(debug=True, host='0.0.0.0', port=port)
