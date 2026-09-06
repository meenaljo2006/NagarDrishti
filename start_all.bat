@echo off
echo ============================================
echo   🚀 Starting NagarDrishti Services
echo ============================================
echo.

echo 📌 Starting AI Service...
start "NagarDrishti AI" cmd /k "cd /d D:\AC\NagarDrishti\ai-services && call venv\Scripts\activate && python src\main_simple.py"

timeout /t 3 /nobreak >nul

echo 📌 Starting Backend...
start "NagarDrishti Backend" cmd /k "cd /d D:\AC\NagarDrishti\backend && npm run dev"

echo.
echo ✅ Both services are starting!
echo 📊 AI Service: http://localhost:8000
echo 📊 Backend: http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul