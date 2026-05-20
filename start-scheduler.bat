@echo off
start "" npm run dev
timeout /t 3 /nobreak > nul
start "" http://localhost:5174
