TeamBeautyBrownsville portable package

Contents:
- api/   self-contained API binary
- web/   compiled frontend assets
- nginx/ nginx distribution with portable config

Windows:
- Run TeamBeautyBrownsville.Launcher.exe from the package root
- Or use start.ps1 / stop.ps1 if needed

macOS:
- Open TeamBeautyBrownsville.app
- To stop: ./TeamBeautyBrownsville.app/Contents/MacOS/TeamBeautyBrownsville stop
- If macOS blocks the app, run:
  xattr -dr com.apple.quarantine "/path/TeamBeautyBrownsville.app"
  codesign --force --deep --sign - "/path/TeamBeautyBrownsville.app"

Linux:
- chmod +x start.sh stop.sh
- ./start.sh
- ./stop.sh

Open http://localhost
