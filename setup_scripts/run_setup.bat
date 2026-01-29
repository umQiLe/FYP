@echo off
echo [1/2] Generating Icon...
powershell -ExecutionPolicy Bypass -File make_icon.ps1

echo.
echo [2/2] Creating Shortcut...
cscript //Nologo make_shortcut.vbs

echo.
echo Done.
pause
