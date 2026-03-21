# iOS Xcode build fails: path contains spaces

If you see:

```text
line 40: /Users/.../Desktop/Software: No such file or directory
PhaseScriptExecution failed
```

the project lives under a folder whose name **contains a space** (e.g. `Software Development`). Some Xcode / React Native shell steps do not quote paths correctly.

## Fix (recommended): use a path without spaces

1. Quit Xcode.
2. Rename or move the project, for example:
   - Rename `Software Development` → `SoftwareDevelopment`, **or**
   - Move the repo to e.g. `~/Developer/duwunkyal-mobile` or `~/duwunkyal-mobile`.
3. From the **new** path run:
   ```bash
   cd /path/to/duwunkyal-mobile
   npx expo prebuild --clean --platform ios
   ```
4. Open `ios/*.xcworkspace` in Xcode and build again.

## Alternative: symlink (no move)

```bash
ln -sf "/Users/thettunkyaw/Desktop/Software Development/Duwunkyal/duwunkyal-mobile" ~/duwunkyal-mobile
cd ~/duwunkyal-mobile
npx expo prebuild --clean --platform ios
```

Always open Xcode and run Terminal from `~/duwunkyal-mobile` (the symlink), not from the path with spaces.

## EAS Build

EAS builders use a path **without** spaces, so **EAS iOS builds can succeed** even when local Xcode fails. Local Archive still needs one of the fixes above.
