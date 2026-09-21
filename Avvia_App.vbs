Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c ""%~dp0launch.bat""", 0, False
