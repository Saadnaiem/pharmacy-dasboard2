# Google Drive CSV Integration Setup Guide

## 🎯 **Current Status**
Your pharmacy dashboard is now running locally with your `sales.csv` file as the data source. The system will automatically use local CSV for development and Google Drive for production.

## 📊 **Local Development Setup ✅ COMPLETED**
- ✅ Environment variables configured (`.env` file created)
- ✅ Local CSV fallback implemented
- ✅ Flask server updated to load `.env` file
- ✅ Dashboard running with your sales data

## 🌐 **Setting Up Google Drive CSV (Optional for Production)**

### Step 1: Upload Your CSV to Google Drive
1. Go to [Google Drive](https://drive.google.com)
2. Click "New" > "File upload"
3. Select your `sales.csv` file (or export updated data from your system)

### Step 2: Make the File Publicly Accessible
1. Right-click on the uploaded CSV file
2. Select "Share"
3. Click "Change to anyone with the link"
4. Set permission to "Viewer"
5. Click "Copy link"

### Step 3: Get the Sharing URL
The URL will look like this:
```
https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7/view?usp=sharing
```

### Step 4: Update Your Environment Configuration

**For Local Development:**
1. Open `.env` file in your project root
2. Uncomment and update the Google Drive URL:
```env
GOOGLE_DRIVE_CSV_URL=https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view?usp=sharing
```
3. Restart the Flask server

**For Production Deployment (Render):**
1. Go to your Render dashboard
2. Select your pharmacy dashboard service
3. Go to "Environment" tab
4. Add environment variable:
   - **Name**: `GOOGLE_DRIVE_CSV_URL`
   - **Value**: Your Google Drive sharing URL
5. Save and redeploy

## 🔄 **How the Data Loading Works**

### Priority Order:
1. **Google Drive**: If `GOOGLE_DRIVE_CSV_URL` is set, loads from Google Drive
2. **Local CSV**: If Google Drive fails or isn't configured, uses local `sales.csv`
3. **Error**: If both fail, shows an error message

### Data Source Indicators:
- **"Google Drive"**: Loading from Google Drive successfully
- **"Local CSV (Development)"**: Using local sales.csv file
- **"Not Configured"**: No data source available

## 📝 **CSV Data Format Requirements**

Your CSV should have these columns (current format is already supported):
```csv
INVOICENUMBER,INVOICEDATE,PHARMACITID,PHARMACISTNAME,COMPANYID,COMPANYNAME,CREDITREVENUE,CASHREVENUE,DISCOUNTAMOUNT,NETREVENUEAMOUNT,VATONCREDITREVENUE,VATONCASHREVENUE,LOCATIONID,LOCATIONNAME
```

## 🧪 **Testing Your Setup**

### Test Local Data (Current):
```bash
curl http://localhost:5000/api/config/google-drive-url
# Should show: "data_source": "Local CSV (Development)"
```

### Test Google Drive Data (After setup):
```bash
curl http://localhost:5000/api/config/google-drive-url
# Should show: "data_source": "Google Drive"
```

## 🚀 **Current Application Status**

**✅ Dashboard Features Working:**
- Total Revenue calculation
- Average Daily Revenue
- Top Sales Day analysis
- Top Transaction Day analysis
- Transaction count metrics
- Active pharmacists tracking
- Date range filtering
- Pharmacist filtering
- Interactive charts

**✅ Data Source:**
- Currently using your local `sales.csv` with 300,278 records
- Ready to switch to Google Drive when configured

**✅ Servers Running:**
- React Frontend: http://localhost:3000
- Flask Backend: http://localhost:5000

## 📋 **Next Steps**

### Immediate (Current Session):
- ✅ Dashboard is ready to use with your data
- ✅ All analytics features are working
- ✅ Test different date ranges and filters

### When Ready for Production:
1. Upload CSV to Google Drive (follow steps above)
2. Update `.env` with Google Drive URL
3. Test locally with Google Drive
4. Deploy to production with environment variables

### For Ongoing Use:
1. Update your CSV data in Google Drive when needed
2. Dashboard will automatically use the latest data
3. No code changes required for data updates

## 🛟 **Troubleshooting**

### Common Issues:
1. **"Not Configured" error**: Check if local `sales.csv` exists and is readable
2. **Google Drive errors**: Ensure file is publicly accessible and URL is correct
3. **Data loading slow**: Large CSV files may take time to process

### Support Commands:
```bash
# Check current data source
curl http://localhost:5000/api/config/google-drive-url

# Check server health
curl http://localhost:5000/api/health

# View server logs
# Check the VS Code terminal running the Flask server
```

---

**🎉 Your pharmacy dashboard is now fully operational with local data and ready for Google Drive integration when needed!**
