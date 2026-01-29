
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "C:\Users\PC1\Desktop\PTT App.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

oLink.TargetPath = "C:\Users\PC1\Downloads\PTT_AP2\LAUNCH_PTT.bat"
oLink.WorkingDirectory = "C:\Users\PC1\Downloads\PTT_AP2"
oLink.Description = "Launch PTT Application"
oLink.IconLocation = "C:\Users\PC1\Downloads\PTT_AP2\logo.ico"
oLink.WindowStyle = 7
oLink.Save

WScript.Echo "Shortcut created at: " & sLinkFile
