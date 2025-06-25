@echo off
echo Starting Flask Server...
cd /d "c:\Saad\saad_programming_env\React"
call venv\Scripts\activate
echo Virtual environment activated
echo Installing required packages...
pip install flask flask-cors pandas requests
echo Starting Flask application...
python app.py
pause
