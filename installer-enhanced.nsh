; ====================================
; Magic English - Enhanced NSIS Installer Script
; ====================================

!include "FileFunc.nsh"

!define PRODUCT_PUBLISHER "Alphatitan, Inc"
!define PRODUCT_WEB_SITE "https://github.com/dtongg03/magic-english"
!define PRODUCT_SUPPORT_URL "https://github.com/dtongg03/magic-english/issues"

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customHeader
  BrandingText "${PRODUCT_PUBLISHER} - ${PRODUCT_NAME} v${VERSION}"
!macroend

!macro customInit
  ; Initialization handled by electron-builder
!macroend

; ====================================
; Custom Installation Steps
; ====================================

!macro customInstall
  ; ====== Registry Entries ======
  
  ; App registry
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}" "InstallDate" "$0"
  
  ; Uninstall registry (proper Windows integration)
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_NAME}.exe,0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "HelpLink" "${PRODUCT_SUPPORT_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "UninstallString" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "NoRepair" 1
  
  ; Calculate installed size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "EstimatedSize" "$0"
  
  ; ====== File Associations ======
  
  ; .medb files (Magic English Database)
  WriteRegStr HKCR ".medb" "" "MagicEnglish.Database"
  WriteRegStr HKCR "MagicEnglish.Database" "" "Magic English Database File"
  WriteRegStr HKCR "MagicEnglish.Database\DefaultIcon" "" "$INSTDIR\${PRODUCT_NAME}.exe,1"
  WriteRegStr HKCR "MagicEnglish.Database\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'
  
  ; .vocab files (Vocabulary Export)
  WriteRegStr HKCR ".vocab" "" "MagicEnglish.Vocab"
  WriteRegStr HKCR "MagicEnglish.Vocab" "" "Magic English Vocabulary File"
  WriteRegStr HKCR "MagicEnglish.Vocab\DefaultIcon" "" "$INSTDIR\${PRODUCT_NAME}.exe,1"
  WriteRegStr HKCR "MagicEnglish.Vocab\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'
  
  ; Refresh shell icons
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  
  ; ====== Start Menu Shortcuts ======
  
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Quick Start Guide.lnk" "$INSTDIR\README.txt"
  
  ; ====== Desktop Shortcut ======
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe" 0
  
  ; ====== Taskbar Pin (Windows 10+) ======
  ; Note: Direct pinning requires user action, but we prepare the shortcut
  
  ; ====== README file ======
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "===================================$\r$\n"
  FileWrite $0 "  ${PRODUCT_NAME} v${VERSION}$\r$\n"
  FileWrite $0 "  ${PRODUCT_PUBLISHER}$\r$\n"
  FileWrite $0 "===================================$\r$\n$\r$\n"
  FileWrite $0 "Thank you for installing ${PRODUCT_NAME}!$\r$\n$\r$\n"
  FileWrite $0 "QUICK START:$\r$\n"
  FileWrite $0 "1. Launch ${PRODUCT_NAME} from your desktop or Start menu$\r$\n"
  FileWrite $0 "2. Configure your AI API settings in Settings$\r$\n"
  FileWrite $0 "3. Start learning vocabulary with AI assistance$\r$\n$\r$\n"
  FileWrite $0 "FEATURES:$\r$\n"
  FileWrite $0 "- Magic Search: Global hotkey search window$\r$\n"
  FileWrite $0 "- AI Chat: Instant explanations in Vietnamese$\r$\n"
  FileWrite $0 "- Word Management: Organize your vocabulary$\r$\n"
  FileWrite $0 "- Dark/Light themes$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT:$\r$\n"
  FileWrite $0 "Website: ${PRODUCT_WEB_SITE}$\r$\n"
  FileWrite $0 "Issues: ${PRODUCT_SUPPORT_URL}$\r$\n$\r$\n"
  FileWrite $0 "Enjoy learning English!$\r$\n"
  FileClose $0
  
  ; ====== Windows Firewall (optional) ======
  ; Uncomment if app needs network access
  ; ExecWait 'netsh advfirewall firewall add rule name="${PRODUCT_NAME}" dir=in action=allow program="$INSTDIR\${PRODUCT_NAME}.exe" enable=yes'
  
!macroend

; ====================================
; Custom Uninstallation
; ====================================

!macro customUnInstall
  ; Close running app
  FindWindow $0 "" "${PRODUCT_NAME}"
  ${If} $0 != 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "${PRODUCT_NAME} is currently running.$\nIt will be closed automatically." IDOK closeApp IDCANCEL cancelUninstall
    closeApp:
      SendMessage $0 ${WM_CLOSE} 0 0
      Sleep 1000
      Goto continue
    cancelUninstall:
      Abort
  ${EndIf}
  continue:
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}"
  
  ; Remove file associations
  DeleteRegKey HKCR ".medb"
  DeleteRegKey HKCR "MagicEnglish.Database"
  DeleteRegKey HKCR ".vocab"
  DeleteRegKey HKCR "MagicEnglish.Vocab"
  
  ; Refresh shell
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  
  ; Remove shortcuts
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  ; Remove firewall rule (if added)
  ; ExecWait 'netsh advfirewall firewall delete rule name="${PRODUCT_NAME}"'
  
  ; Ask about user data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all your vocabulary data and settings?" IDYES removeData IDNO keepData
  removeData:
    RMDir /r "$APPDATA\magic-english"
    RMDir /r "$LOCALAPPDATA\magic-english"
  keepData:
  
!macroend

; ====================================
; Custom Install Mode
; ====================================

!macro customInstallMode
  ; Force per-machine installation for all users
  SetShellVarContext all
!macroend

