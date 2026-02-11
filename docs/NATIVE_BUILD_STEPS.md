# Native build steps (Android / iOS)

## App icon ပြောင်းပြီးရင် (e.g. favicon.png)

Device / emulator မှာ **အဟောင်း icon ပဲ ဆက်ပြနေရင်** – native project ကို ပြန် generate လုပ်ပြီး app ကို ပြန် build လုပ်ပါ။

### 1. Native project ပြန် generate လုပ်ပါ (icon/splash အသစ်ပါအောင်)

```bash
npx expo prebuild --clean
```

- `--clean` က ရှိပြီးသား `android/` နဲ့ `ios/` ကို ဖျက်ပြီး `app.json` အတိုင်း အသစ်ထုတ်ပေးပါတယ်။  
- ဒါကြောင့် **icon** နဲ့ **splash** က `app.json` မှာ ထည့်ထားတဲ့ file တွေအတိုင်း ပါသွားပါမယ်။  

### 2. Android app ပြန် build / run လုပ်ပါ

```bash
npm run android
# သို့မဟုတ်
npx expo run:android
```

Release build လိုရင် (ဒေတာရှိရင်):

```bash
cd android && ./gradlew assembleRelease
```

APK က `android/app/build/outputs/apk/release/app-release.apk` မှာ ထွက်ပါမယ်။  

### 3. Device / emulator မှာ အဟောင်း app ဖျက်ပြီး အသစ် install လုပ်ပါ

- **အဟောင်း Duwunkyal app ကို uninstall** လုပ်ပါ။  
- အသစ် build ထုတ်ထားတဲ့ app ကို **ပြန် install** လုပ်ပါ။  

ဒီအဆင့်တွေ လုပ်ပြီးရင် home screen / app drawer မှာ **icon အသစ် (favicon.png)** ပြနေပါမယ်။  

---

## အတိုချုပ်

| လုပ်ချင် တာ           | ပြေးရမယ့် command |
|-------------------------|----------------------|
| Icon/splash ပြောင်းပြီး native ပြန် ထုတ်မယ် | `npx expo prebuild --clean` |
| Android run/build       | `npm run android` သို့မဟုတ် `npx expo run:android` |
| Release APK ထုတ်မယ်   | `cd android && ./gradlew assembleRelease` |
