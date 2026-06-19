@echo off
start http://localhost:8080/app/index.html
py -m http.server 8080
pause
