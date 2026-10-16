@echo off
rem Start the xiaohongshu-mcp server, loopback-only, with all state kept inside this folder.
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
echo [xhs] MCP endpoint: http://127.0.0.1:18060/mcp
"%~dp0bin\xiaohongshu-mcp-windows-amd64.exe" -port 127.0.0.1:18060 %*
