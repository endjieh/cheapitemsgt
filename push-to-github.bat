@echo off
title Push ke GitHub
echo ====================================================
echo Upload Kode Bot ke GitHub (Private Repository)
echo ====================================================
echo.
echo Pastikan Anda sudah membuat repository di https://github.com/new
echo.
set /p REPO_URL="Tempel / Paste URL Repository GitHub Anda di sini: "

if "%REPO_URL%"=="" (
    echo [ERROR] URL tidak boleh kosong!
    pause
    exit /b
)

echo.
echo Mengatur branch ke main...
git branch -M main

echo Mengatur remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo Mengupload kode ke GitHub...
git push -u origin main

echo.
echo ====================================================
echo Selesai! Sekarang buka https://koyeb.com untuk deploy.
echo ====================================================
pause
