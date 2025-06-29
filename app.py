from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import requests
import io
from dotenv import load_dotenv

# Load environment variables from .env file (for local development)
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set static folder to React build output for production
REACT_BUILD_DIR = os.path.join(os.path.dirname(__file__), 'client', 'build')
if os.path.exists(REACT_BUILD_DIR):
    app.static_folder = REACT_BUILD_DIR
    app.static_url_path = ''
else:
    app.static_folder = 'static'
    app.static_url_path = ''

# Configuration for Google Drive CSV
# You must set this as an environment variable in production
GOOGLE_DRIVE_CSV_URL = os.getenv('GOOGLE_DRIVE_CSV_URL')

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
    Load CSV data from Google Drive or local file (for development)
    Tries Google Drive first if GOOGLE_DRIVE_CSV_URL is set, falls back to local sales.csv
    """
    print("Loading CSV data...")
    
    # Try Google Drive first if URL is configured
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
            print("🔄 Falling back to local CSV file...")
    
    # Fallback to local CSV file (for development)
    try:
        local_csv_path = os.path.join(os.path.dirname(__file__), 'sales.csv')
        if os.path.exists(local_csv_path):
            df = pd.read_csv(local_csv_path)
            print(f"✅ Successfully loaded {len(df)} rows from local CSV file")
            return df
        else:
            raise FileNotFoundError("Local sales.csv file not found")
            
    except Exception as e:
        print(f"❌ Failed to load from local CSV: {str(e)}")
        raise Exception(f"Failed to load data from both Google Drive and local CSV. Please check your configuration or local sales.csv file. Error: {str(e)}")

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
    """Get current Google Drive URL configuration and data source status"""
    local_csv_exists = os.path.exists(os.path.join(os.path.dirname(__file__), 'sales.csv'))
    
    if GOOGLE_DRIVE_CSV_URL:
        data_source = "Google Drive"
    elif local_csv_exists:
        data_source = "Local CSV (Development)"
    else:
        data_source = "Not Configured"
    
    return jsonify({
        "google_drive_url": GOOGLE_DRIVE_CSV_URL,
        "data_source": data_source,
        "is_configured": bool(GOOGLE_DRIVE_CSV_URL) or local_csv_exists,
        "local_csv_available": local_csv_exists
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
            return jsonify({"success": True, "message": "Google Drive URL cleared. No data source configured."})
            
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

@app.route('/api/sales-data-meta')
def get_sales_data_meta():
    """Get metadata about the sales data (counts, available years, etc.) for faster loading"""
    try:
        print("Getting sales data metadata...")
        
        # Load raw CSV without heavy processing for faster metadata
        if GOOGLE_DRIVE_CSV_URL:
            try:
                download_url = get_google_drive_download_url(GOOGLE_DRIVE_CSV_URL)
                response = requests.get(download_url, timeout=30)
                response.raise_for_status()
                csv_content = io.StringIO(response.text)
                df = pd.read_csv(csv_content)
            except Exception as e:
                print(f"Failed to load from Google Drive: {e}")
                df = pd.read_csv(os.path.join(os.path.dirname(__file__), 'sales.csv'))
        else:
            df = pd.read_csv(os.path.join(os.path.dirname(__file__), 'sales.csv'))
        
        print(f"Raw CSV loaded: {len(df)} rows")
        
        # Quick processing for metadata only
        total_rows = len(df)
        
        # Sample first 10,000 rows for quick metadata extraction
        sample_df = df.head(10000).copy()
        
        # Quick date processing for sample
        sample_df['Date'] = pd.to_datetime(sample_df['INVOICEDATE'], format='%d/%m/%Y', errors='coerce')
        sample_df.dropna(subset=['Date'], inplace=True)
        sample_df['Year'] = sample_df['Date'].dt.year
        
        # Get available years from sample
        available_years = sorted(sample_df['Year'].unique().tolist(), reverse=True)
          # Get unique locations from sample (filter out NaN values)
        unique_locations = df['LOCATIONNAME'].dropna().drop_duplicates().head(50).tolist()
        
        # Quick stats from sample
        sample_revenue = sample_df['NETREVENUEAMOUNT'].sum() if 'NETREVENUEAMOUNT' in sample_df.columns else 0
        return_transactions = sample_df[sample_df['INVOICENUMBER'].str.contains('-R', na=False)] if 'INVOICENUMBER' in sample_df.columns else []
        
        metadata = {
            'total_rows': total_rows,
            'date_range': {
                'min': sample_df['Date'].min().strftime('%Y-%m-%d') if not sample_df['Date'].empty else None,
                'max': sample_df['Date'].max().strftime('%Y-%m-%d') if not sample_df['Date'].empty else None
            },
            'available_years': available_years,
            'sample_locations': unique_locations,
            'total_revenue': float(sample_revenue),
            'total_returns': len(return_transactions),
            'data_source': 'Google Drive' if GOOGLE_DRIVE_CSV_URL else 'Local CSV',
            'note': 'Metadata calculated from sample data for performance'
        }
        
        print(f"Fast metadata generated: {total_rows} rows, {len(available_years)} years, {len(unique_locations)} locations")
        return jsonify(metadata)
        
    except Exception as e:
        print(f"ERROR in get_sales_data_meta: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales-data-filtered')
def get_filtered_sales_data():
    """Get filtered sales data based on query parameters for better performance"""
    try:
        # Get filter parameters
        years = request.args.getlist('years')
        months = request.args.getlist('months')
        locations = request.args.getlist('locations')
        limit = request.args.get('limit', 10000, type=int)  # Default limit to prevent overload
        offset = request.args.get('offset', 0, type=int)
        
        print(f"Filtering data: years={years}, months={months}, locations={locations[:3] if len(locations) > 3 else locations}, limit={limit}")
        print(f"Request args: {dict(request.args)}")
        
        if not years and not months and not locations:
            print("No filters provided, returning empty result")
            return jsonify({
                'data': [],
                'metadata': {
                    'total_filtered': 0,
                    'returned_count': 0,
                    'offset': 0,
                    'limit': limit,
                    'has_more': False
                }
            })
        
        df = load_csv_data()
        
        # Process data similar to main endpoint
        print("Processing dates for filtering...")
        df['Date'] = pd.to_datetime(df['INVOICEDATE'], format='%d/%m/%Y', errors='coerce')
        df.dropna(subset=['Date'], inplace=True)
        
        # Add Year and Month columns
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
        
        # Apply return logic
        df['NetRevenueAmount'] = df.apply(
            lambda row: -row['NETREVENUEAMOUNT'] if '-R' in str(row['INVOICENUMBER']) else row['NETREVENUEAMOUNT'], 
            axis=1
        )
        
        # Apply filters
        if years:
            df = df[df['Year'].isin([int(y) for y in years])]
        
        if months:
            df = df[df['Month'].isin([int(m) for m in months])]
        
        if locations:
            df = df[df['LOCATIONNAME'].isin(locations)]
        
        # Apply pagination
        total_filtered = len(df)
        df = df.iloc[offset:offset + limit]
        
        result = {
            'data': df.to_dict('records'),
            'metadata': {
                'total_filtered': total_filtered,                'returned_count': len(df),
                'offset': offset,
                'limit': limit,
                'has_more': offset + limit < total_filtered
            }
        }
        
        print(f"Filtered data: {total_filtered} total, returning {len(df)} rows")
        return jsonify(result)
        
    except Exception as e:
        print(f"ERROR in get_filtered_sales_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-data')
def test_data():
    """Simple test endpoint that returns sample data"""
    try:
        # Return hardcoded sample data for testing
        sample_data = [
            {
                'INVOICENUMBER': 'INV001',
                'INVOICEDATE': '01/01/2024',
                'Date': '2024-01-01',
                'NETREVENUEAMOUNT': 150.50,
                'NetRevenueAmount': 150.50,
                'LOCATIONNAME': 'Narjis Pharmacy',
                'PHARMACISTNAME': 'Dr. Ahmed'
            },
            {
                'INVOICENUMBER': 'INV002', 
                'INVOICEDATE': '01/01/2024',
                'Date': '2024-01-01',
                'NETREVENUEAMOUNT': 75.25,
                'NetRevenueAmount': 75.25,
                'LOCATIONNAME': 'Albustan pharmacy',
                'PHARMACISTNAME': 'Dr. Sara'
            }
        ]
        
        result = {
            'data': sample_data,
            'metadata': {
                'total_filtered': len(sample_data),
                'returned_count': len(sample_data),
                'offset': 0,
                'limit': 100,
                'has_more': False
            }
        }
        
        return jsonify(result)
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
    print(f"Google Drive CSV URL configured: {'Yes' if GOOGLE_DRIVE_CSV_URL else 'No'}")
    
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
