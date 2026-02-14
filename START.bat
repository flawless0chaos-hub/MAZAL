@echo off
chcp 65001 >nul
echo.
echo ====================================
echo    🎰 Family Slot Arena 🎰
echo ====================================
echo.
echo מתקין תלויות...
call npm install
echo.
echo מפעיל את השרת...
echo.
echo ================================
echo   המשחק מוכן!
echo   פתח בדפדפן: http://localhost:3000
echo ================================
echo.
call npm run dev
