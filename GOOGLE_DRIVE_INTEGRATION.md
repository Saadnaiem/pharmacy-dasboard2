# Google Drive CSV Integration Guide

## Overview
Your Pharmacy Dashboard now supports reading CSV data directly from Google Drive! This allows you to:
- Keep your data in the cloud
- Share access with team members
- Automatically sync updates
- Maintain data security with Google's infrastructure

## Quick Setup

### Step 1: Prepare Your CSV File
1. Upload your `sales.csv` file to Google Drive
2. Ensure the CSV has the same structure as your local file with columns:
   - `INVOICENUMBER`
   - `INVOICEDATE` (DD/MM/YYYY format)
   - `NETREVENUEAMOUNT`
   - `PHARMACISTNAME`
   - `LOCATIONNAME`
   - `CASHREVENUE`
   - `CREDITREVENUE`

### Step 2: Make the File Shareable
1. Right-click your CSV file in Google Drive
2. Select "Share"
3. Click "Change to anyone with the link"
4. Set permission to "Viewer" (recommended for security)
5. Copy the share link

### Step 3: Configure the Dashboard
1. Open your Pharmacy Dashboard
2. Click the "☁️ Data Source" button at the top
3. Paste your Google Drive share link
4. Click "💾 Save & Test"
5. Wait for confirmation that the data loaded successfully

## Supported Google Drive URL Formats

The system automatically handles these Google Drive URL formats:

```
✅ https://drive.google.com/file/d/FILE_ID/view?usp=sharing
✅ https://drive.google.com/open?id=FILE_ID
✅ https://drive.google.com/uc?export=download&id=FILE_ID
```

## Features

### Automatic Fallback
- **Primary**: Google Drive URL (if configured)
- **Fallback**: Local `sales.csv` file
- **Error Handling**: Clear error messages if neither source is available

### Real-time Configuration
- Change data sources without restarting the application
- Test connection immediately when updating URL
- View current data source status

### Data Validation
- Same data processing and validation as local files
- Handles return transactions (invoices with '-R')
- Date format validation and parsing
- Revenue range validation

## API Endpoints

### Configuration Management
```
GET /api/config/google-drive-url
- Returns current configuration and status

POST /api/config/google-drive-url
- Updates Google Drive URL
- Tests connection and validates data
```

### Data Access
```
GET /api/sales-data
- Returns processed sales data
- Automatically uses Google Drive or local file

GET /api/health
- Server health check

GET /api/verify-totals
- Data validation and totals verification
```

## Security Best Practices

### Google Drive Security
1. **Use "Viewer" permissions only** - prevents accidental modifications
2. **Share with specific people** when possible instead of "anyone with link"
3. **Regularly review shared files** in your Google Drive
4. **Use organization accounts** for business data

### Application Security
1. **Environment Variables**: Set `GOOGLE_DRIVE_CSV_URL` as environment variable for production
2. **HTTPS**: Ensure your application uses HTTPS in production
3. **Access Control**: Implement user authentication for production deployments

## Troubleshooting

### Common Issues

**❌ "Invalid Google Drive URL"**
- Ensure the URL contains `drive.google.com`
- Try copying the share link again
- Check that the file is publicly accessible

**❌ "Failed to load data from new URL"**
- Verify the file is shared with "Anyone with the link"
- Check that the CSV format matches expected columns
- Ensure the file isn't empty or corrupted

**❌ "No data source available"**
- Either configure a Google Drive URL or place `sales.csv` in the root directory
- Check that the local file exists and has read permissions

### File Format Validation
Ensure your CSV has these required columns:
```csv
INVOICENUMBER,INVOICEDATE,NETREVENUEAMOUNT,PHARMACISTNAME,LOCATIONNAME,CASHREVENUE,CREDITREVENUE
INV001,15/06/2024,150.50,Dr. Smith,Main Branch,150.50,0.00
INV002,16/06/2024,275.25,Dr. Johnson,North Branch,0.00,275.25
```

### Performance Considerations
- **Large files**: Google Drive download may take longer than local files
- **Network dependency**: Requires internet connection
- **Caching**: Consider implementing caching for frequently accessed data
- **Rate limits**: Google Drive has API rate limits for excessive requests

## Environment Variables

For production deployment, set these environment variables:

```bash
# Required: Google Drive CSV URL
GOOGLE_DRIVE_CSV_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing

# Optional: Flask configuration
FLASK_ENV=production
FLASK_DEBUG=false
```

## Monitoring and Maintenance

### Log Messages
The backend provides detailed logging for Google Drive operations:
- ✅ Successful loads from Google Drive
- ❌ Failed Google Drive access with fallback to local file
- 📊 Data processing statistics
- 🔄 URL configuration changes

### Regular Maintenance
1. **Monitor data freshness**: Update your Google Drive file regularly
2. **Check access permissions**: Ensure share links remain active
3. **Backup local files**: Keep local copies as backup
4. **Update documentation**: Keep team informed of any URL changes

## Integration Examples

### Setting URL via Environment Variable
```python
import os
GOOGLE_DRIVE_CSV_URL = os.getenv('GOOGLE_DRIVE_CSV_URL', None)
```

### Programmatic URL Update
```javascript
// Update Google Drive URL via API
const response = await axios.post('/api/config/google-drive-url', {
  url: 'https://drive.google.com/file/d/NEW_FILE_ID/view?usp=sharing'
});
```

### Checking Current Configuration
```javascript
// Get current data source configuration
const config = await axios.get('/api/config/google-drive-url');
console.log('Current source:', config.data.data_source);
```

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Google Drive file permissions
3. Test with a smaller sample CSV file first
4. Ensure your internet connection is stable
5. Contact your system administrator for deployment-specific issues

---

**Created by Dr. Saad Naiem Ali**  
*Advanced Pharmacy Dashboard - Google Drive Integration*
