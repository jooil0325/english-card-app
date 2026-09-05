@echo off
chcp 65001 > nul
title TUK English Learning App Server
echo ========================================================
echo   [TUK] 영어 문장 암기 앱 서버를 시작합니다...
echo   로컬 주소: http://localhost:8000
echo ========================================================
echo.

REM 의존성 패키지 확인 및 설치
python -m pip install -q -r requirements.txt

REM 메인 서버 구동
python main.py
pause
