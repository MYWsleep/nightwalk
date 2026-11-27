@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在合并 12 个分卷...
copy /b nw-setup.part00+nw-setup.part01+nw-setup.part02+nw-setup.part03+nw-setup.part04+nw-setup.part05+nw-setup.part06+nw-setup.part07+nw-setup.part08+nw-setup.part09+nw-setup.part10+nw-setup.part11 "Nightwalk-Setup-1.0.1.exe" >nul
if errorlevel 1 (echo 合并失败。& pause & exit /b 1)
echo 完成：Nightwalk-Setup-1.0.1.exe
echo SHA256 应为 e14ffc79570b21553cb0e4417fbd6808936b5952e70993fc3697f72ac0cd9ead
echo 双击该文件即可安装。
pause
