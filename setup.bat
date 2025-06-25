@echo off
echo ========================================
echo   Pharmacy Dashboard Setup Script
echo   Created by Dr. Saad Naiem Ali
echo ========================================
echo.

echo Setting up Python virtual environment...
python -m venv venv
call venv\Scripts\activate

echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Setting up React frontend...
cd client
npm install
cd ..

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the application:
echo   1. Backend:  python app.py
echo   2. Frontend: cd client && npm start
echo   3. Or both:  npm start
echo.
echo Dashboard will be available at:
echo   http://localhost:3000
echo.
pause
