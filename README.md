# Pharmacy Dashboard

A comprehensive React-based dashboard for pharmacy sales analytics and business intelligence.

## 📊 Features

### Advanced Analytics
- **Revenue Analytics**: Total revenue tracking with year-over-year comparisons
- **Transaction Analysis**: Complete transaction monitoring and trends
- **Pharmacist Performance**: Individual pharmacist revenue tracking and rankings
- **Location Analysis**: Revenue breakdown by pharmacy locations
- **Payment Method Analytics**: Cash vs Credit transaction analysis

### Interactive Filtering
- **Multi-Select Filters**: Year, month, and location filters with multiple selection support
- **Dynamic Charts**: Real-time chart updates based on filter selections
- **Comparison Views**: Side-by-side year comparisons for selected periods

### Data Visualizations
- **Line Charts**: Monthly revenue and transaction trends
- **Bar Charts**: Top performing pharmacists analysis
- **Doughnut Charts**: Payment method distribution
- **Data Tables**: Detailed performance metrics and rankings

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd React
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Set up React frontend**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Prepare data**
   - Place your `sales.csv` file in the root directory
   - Ensure CSV has the required columns (see Data Format section)

### Running the Application

1. **Start the backend (Flask API)**
   ```bash
   python app.py
   ```
   Backend will run on `http://localhost:5000`

2. **Start the frontend (React)**
   ```bash
   cd client
   npm start
   ```
   Frontend will run on `http://localhost:3000`

3. **Access the dashboard**
   Open `http://localhost:3000` in your browser

## 📁 Project Structure

```
React/
├── app.py                 # Flask backend API
├── requirements.txt       # Python dependencies
├── sales.csv             # Sales data (CSV format)
├── start_flask.bat       # Windows batch script to start Flask
├── restart_backend.ps1   # PowerShell script to restart backend
├── BUILD.md              # Build instructions
├── DEPLOYMENT.md         # Deployment guide
├── README.md             # This file
├── venv/                 # Python virtual environment
├── .vscode/              # VS Code configuration
└── client/               # React frontend
    ├── public/
    │   ├── index.html    # Main HTML template
    │   └── manifest.json # PWA manifest
    ├── src/
    │   ├── App.js        # Main dashboard component
    │   ├── App.css       # Dashboard styles
    │   ├── index.js      # React entry point
    │   ├── index.css     # Global styles
    │   └── components/
    │       └── Card.js   # Reusable card component
    ├── package.json      # Node.js dependencies
    └── build/            # Production build (generated)
```

## 📋 Data Format

The application expects a CSV file with the following columns:

- `INVOICENUMBER`: Unique invoice identifier
- `INVOICEDATE`: Date in DD/MM/YYYY format
- `PHARMACISTNAME`: Name of the pharmacist
- `NETREVENUEAMOUNT`: Revenue amount for the transaction
- `LOCATIONNAME`: Pharmacy location name
- `CASHREVENUE`: Cash payment amount
- `CREDITREVENUE`: Credit payment amount

## 🔧 Development

### Backend (Flask)
- **File**: `app.py`
- **Purpose**: Provides REST API for sales data
- **Endpoints**:
  - `GET /api/sales-data`: Returns processed sales data
  - `GET /api/health`: Health check endpoint

### Frontend (React)
- **Main Component**: `client/src/App.js`
- **Styling**: `client/src/App.css`
- **Features**:
  - Multi-select filters
  - Interactive charts (Chart.js)
  - Responsive design
  - Real-time data updates

### Key Technologies
- **Backend**: Flask, Pandas, CORS
- **Frontend**: React, Chart.js, Axios
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Data Processing**: Pandas for CSV parsing and data manipulation

## 🎨 Customization

### Adding New Metrics
1. Add calculation logic in `calculateMetrics()` function in `App.js`
2. Create new metric cards in the metrics grid section
3. Update CSS for styling if needed

### Adding New Charts
1. Import required Chart.js components
2. Add chart data preparation in `calculateMetrics()`
3. Add chart component in the charts grid section
4. Style using existing CSS classes

### Modifying Filters
1. Update filter options in the multi-select components
2. Modify filter logic in `calculateMetrics()`
3. Add new filter state if needed

## 🚀 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

## 👨‍💻 Author

**Dr. Saad Naiem Ali**
- Healthcare Technology Professional
- Business Intelligence Specialist

## 📄 License

This project is proprietary software created for pharmacy analytics.

## 🤝 Support

For support and questions, please contact the development team.

---

*Built with ❤️ for modern pharmacy analytics*
