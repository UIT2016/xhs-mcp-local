@echo off
rem Open the Xiaohongshu login window; scan the QR code with the phone app of the account to use.
setlocal
set "XHS_HOME=%~dp0"
set "USERPROFILE=%XHS_HOME%home"
set "APPDATA=%XHS_HOME%home\AppData\Roaming"
set "LOCALAPPDATA=%XHS_HOME%home\AppData\Local"
set "TEMP=%XHS_HOME%tmp"
set "TMP=%XHS_HOME%tmp"
set "COOKIES_PATH=%XHS_HOME%run\cookies.json"
if not exist "%TEMP%" mkdir "%TEMP%"
if not exist "%XHS_HOME%run" mkdir "%XHS_HOME%run"
cd /d "%XHS_HOME%run"
"%~dp0bin\xiaohongshu-login-windows-amd64.exe" %*
