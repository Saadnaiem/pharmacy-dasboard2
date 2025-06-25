@echo off
echo ========================================
echo   Pharmacy Dashboard Build Script
echo   Creating Production Build
echo ========================================
echo.

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Building React frontend...
cd client
npm run build
cd ..

echo.
echo Production build created in client/build/
echo.
echo To serve the production build:
echo   1. Use a web server to serve client/build/
echo   2. Ensure Flask backend is running: python app.py
echo.
echo ========================================
echo   Build Complete!
echo ========================================
pause
