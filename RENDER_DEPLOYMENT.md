# 🚀 Render Deployment Guide - Pharmacy Dashboard

## Overview
This guide helps you deploy your Pharmacy Dashboard on Render with support for both local CSV files and Google Drive CSV integration.

## 📋 Prerequisites
- GitHub account
- Render account (free tier available)
- Your pharmacy data CSV file
- Optional: Google Drive account for cloud data storage

## 🔧 Deployment Steps

### Step 1: Prepare for GitHub
1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Pharmacy Dashboard"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Name it something like `pharmacy-dashboard`
   - Keep it public or private (your choice)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/pharmacy-dashboard.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Render Configuration

#### For Backend (Flask API)
1. **Service Type**: Web Service
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `python app.py`
4. **Environment**: Python 3
5. **Instance Type**: Free (for testing) or paid for production

#### For Frontend (React)
1. **Service Type**: Static Site
2. **Build Command**: `cd client && npm install && npm run build`
3. **Publish Directory**: `client/build`

### Step 3: Environment Variables on Render

#### Required Environment Variables:
```
# Optional: Google Drive CSV URL
GOOGLE_DRIVE_CSV_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing

# Flask Configuration
FLASK_ENV=production
PORT=5000
```

#### For Google Drive Integration:
1. Upload your CSV to Google Drive
2. Share with "Anyone with the link" access
3. Copy the share URL
4. Add as `GOOGLE_DRIVE_CSV_URL` environment variable in Render

### Step 4: Database/CSV Data Options

#### Option A: Local CSV File
- Include `sales.csv` in your repository
- No additional configuration needed
- Data is static until you update the repository

#### Option B: Google Drive CSV
- Upload CSV to Google Drive
- Set `GOOGLE_DRIVE_CSV_URL` environment variable
- Data updates automatically when you update the Google Drive file

#### Option C: Hybrid Approach (Recommended)
- Include a sample/backup `sales.csv` in repository
- Configure Google Drive URL for live data
- Automatic fallback to local file if Google Drive is unavailable

### Step 5: Build Configuration

The app is configured to:
1. **Backend**: Runs on port 5000 (or PORT environment variable)
2. **Frontend**: Builds to static files, serves from any CDN/static hosting
3. **API Proxy**: Frontend configured to proxy `/api` calls to backend

### Step 6: Production Optimizations

#### Backend (`app.py`):
- Debug mode automatically disabled in production
- CORS configured for cross-origin requests
- Error handling for production environment
- Automatic data source detection (Google Drive → Local → Error)

#### Frontend:
- Production build optimizations enabled
- Static asset optimization
- Responsive design for all devices
- Service worker for offline capabilities

## 🌐 Render Service Setup

### Backend Service Configuration:
```yaml
name: pharmacy-dashboard-api
type: web
env: python
buildCommand: pip install -r requirements.txt
startCommand: python app.py
healthCheckPath: /api/health
envVars:
  - key: GOOGLE_DRIVE_CSV_URL
    value: YOUR_GOOGLE_DRIVE_URL_HERE
  - key: FLASK_ENV
    value: production
```

### Frontend Service Configuration:
```yaml
name: pharmacy-dashboard-frontend
type: static
buildCommand: cd client && npm install && npm run build
publishDir: client/build
envVars:
  - key: REACT_APP_API_URL
    value: https://your-backend-service.onrender.com
```

## 🔒 Security Considerations

1. **Google Drive CSV**:
   - Use "Anyone with the link" sharing (not public)
   - Regularly rotate the file/link if needed
   - Monitor access logs in Google Drive

2. **Environment Variables**:
   - Never commit sensitive URLs to GitHub
   - Use Render's environment variable system
   - Keep backup of important configurations

3. **Data Privacy**:
   - Ensure CSV data complies with privacy regulations
   - Consider data anonymization for public deployments
   - Regular security updates

## 🚀 Deployment Process

### Quick Deploy to Render:

1. **Connect GitHub**: Link your GitHub repository to Render
2. **Create Web Service**: For the Flask backend
3. **Create Static Site**: For the React frontend
4. **Configure Environment**: Add Google Drive URL if using
5. **Deploy**: Render automatically builds and deploys

### Custom Domain (Optional):
- Configure custom domain in Render dashboard
- Update DNS records to point to Render
- SSL certificate automatically provided

## 📊 Monitoring & Maintenance

### Health Checks:
- Backend: `/api/health` endpoint
- Frontend: Standard HTTP checks
- Data source: `/api/config/google-drive-url` for status

### Logging:
- Render provides built-in logging
- Monitor for data loading errors
- Track API response times

### Updates:
- **Code Updates**: Push to GitHub → Auto-deploy
- **Data Updates**: Update Google Drive file → Automatic refresh
- **Configuration**: Update environment variables in Render dashboard

## 🎯 Benefits of This Setup

✅ **Flexible Data Sources**: Local CSV backup + Google Drive integration  
✅ **Zero-Downtime Updates**: Update data without redeploying code  
✅ **Cost-Effective**: Free tier available, scales as needed  
✅ **Professional URLs**: Custom domains supported  
✅ **Global CDN**: Fast loading worldwide  
✅ **Automatic SSL**: HTTPS enabled by default  
✅ **Easy Maintenance**: Update data via Google Drive UI  

## 🆘 Troubleshooting

### Common Issues:
1. **Build Failures**: Check Node.js/Python versions
2. **CORS Errors**: Verify frontend-backend URL configuration
3. **Data Loading Issues**: Check Google Drive URL format and permissions
4. **Performance**: Monitor data file size and consider pagination

### Support Resources:
- Render Documentation: https://render.com/docs
- GitHub Issues: Create issues in your repository
- Community Support: Render Discord/Forums

---

**Created by Dr. Saad Naiem Ali**  
**Advanced Pharmacy Dashboard for Sales Analytics and Business Intelligence**
