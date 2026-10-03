@echo off
setlocal

REM === ім’я вихідного файлу (оригінальна іконка PNG) ===
set SRC_JS_ANESA=promt.png

REM === створюємо вихідні іконки у потрібних розмірах ===
magick %SRC_JS_ANESA% -resize 16x16   js-promt-16x16.png
magick %SRC_JS_ANESA% -resize 32x32   js-promt-32x32.png
magick %SRC_JS_ANESA% -resize 48x48   js-promt-48x48.png
magick %SRC_JS_ANESA% -resize 70x70   js-promt-70x70.png
magick %SRC_JS_ANESA% -resize 71x71   js-promt-71x71.png
magick %SRC_JS_ANESA% -resize 72x72   js-promt-72x72.png
magick %SRC_JS_ANESA% -resize 96x96   js-promt-96x96.png


magick %SRC_JS_ANESA% -resize 120x120   js-promt-120x120.png
magick %SRC_JS_ANESA% -resize 128x128   js-promt-128x128.png
magick %SRC_JS_ANESA% -resize 144x144   js-promt-144x144.png
magick %SRC_JS_ANESA% -resize 150x150   js-promt-150x150.png
magick %SRC_JS_ANESA% -resize 152x152   js-promt-152x152.png
magick %SRC_JS_ANESA% -resize 167x167   js-promt-167x167.png
magick %SRC_JS_ANESA% -resize 180x180   js-promt-180x180.png
magick %SRC_JS_ANESA% -resize 192x192   js-promt-192x192.png

magick %SRC_JS_ANESA% -resize 256x256   js-promt-256x256.png

magick %SRC_JS_ANESA% -resize 300x300   js-promt-300x300.png
magick %SRC_JS_ANESA% -resize 310x310   js-promt-310x310.png


magick %SRC_JS_ANESA% -resize 512x512   js-promt-512x512.png
magick %SRC_JS_ANESA% -resize 512x512 -colorspace Gray js-promt-512x512-gray.png
magick %SRC_JS_ANESA% -resize 1024x1024 js-promt-1024x1024.png

echo.
echo ✅ Іконки створено!
pause
