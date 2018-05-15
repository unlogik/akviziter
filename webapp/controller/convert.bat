 if "%~1"=="" (
 echo "Provide pdf file to process"
 ) else (
 gswin64c.exe -q -dNOPAUSE -dBATCH -r144 -g800x400 -sDEVICE=pngmono -dLastPage=1 -sOutputFile=qrcode_20180406110255.png -c "<</PageOffset [ -120 650]>> setpagedevice" -f "%~1"
 )