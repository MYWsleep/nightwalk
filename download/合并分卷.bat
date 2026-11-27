@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist Nightwalk-1.0.0-win64.zip.001 (
  echo 没找到分卷文件 .001，请把本 bat 和六个分卷放在同一文件夹。
  pause
  exit /b 1
)
if exist Nightwalk-1.0.0-win64.zip del /q Nightwalk-1.0.0-win64.zip
copy /b Nightwalk-1.0.0-win64.zip.001+Nightwalk-1.0.0-win64.zip.002+Nightwalk-1.0.0-win64.zip.003+Nightwalk-1.0.0-win64.zip.004+Nightwalk-1.0.0-win64.zip.005+Nightwalk-1.0.0-win64.zip.006 Nightwalk-1.0.0-win64.zip
if exist Nightwalk-1.0.0-win64.zip (
  echo.
  echo 已生成 Nightwalk-1.0.0-win64.zip，解压后双击 启动夜归.bat。
) else (
  echo 合并失败：检查六个分卷是否齐全。
)
pause