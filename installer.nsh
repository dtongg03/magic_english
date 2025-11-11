!macro preInit
  ; Custom pre-initialization
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customHeader
  ; Installer header customization
!macroend

!macro customInit
  ; Custom initialization
!macroend

!macro customInstall
  ; Create registry entries for proper Windows integration
  WriteRegStr HKLM "Software\Magic English" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\Magic English" "InstallPath" "$INSTDIR"
  
  ; Add to Windows Programs list
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayName" "Magic English"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" "$INSTDIR\Magic English.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "Publisher" "dtongg03"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "URLInfoAbout" "https://github.com/dtongg03"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "NoRepair" 1
!macroend

!macro customUnInstall
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Magic English"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}"
!macroend

!macro customInstallMode
  ; Customize install mode
!macroend
