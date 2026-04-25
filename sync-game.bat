@echo off
:: 一键同步：肉鸽飞机大战 → 作品集网站/肉鸽飞机大战
set SOURCE=D:\Desktop\肉鸽飞机大战
set TARGET=D:\Desktop\作品集网站\肉鸽飞机大战

echo === 同步游戏文件 ===
echo 源: %SOURCE%
echo 目标: %TARGET%

:: 排除 .git .claude
robocopy "%SOURCE%" "%TARGET%" /E /MIR /XD ".git" ".claude" /NFL /NDL /NJH /NJS

echo.
echo 同步完成！
pause
