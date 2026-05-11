@echo off
echo Restructuration de ComptaFlow...

if not exist frontend (
    mkdir frontend
)

move *.html frontend\
move style.css frontend\
move auth.js frontend\
move schema.sql workers\schema.sql

echo Restructuration terminee !
pause
