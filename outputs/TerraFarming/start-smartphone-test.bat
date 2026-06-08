@echo off
cd /d "%~dp0"
echo TerraFarming smartphone test server
echo.
echo PC URL: http://127.0.0.1:8080/
echo Smartphone URL example: http://192.168.68.58:8080/
echo.
echo Keep this window open while testing.
echo If Windows Firewall asks, allow access on private networks.
echo.
"C:\Users\Hallows\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8080 --bind 0.0.0.0
