# Place Order Notification – Manual Checklist

**Features:**
- **Notification bar** appears after Place Order (heads-up style, like other apps)
- **Tap notification** → Opens Order Details page for that order

If the notification does **not** appear or tapping does not open the order, check these items. Several require manual setup on your device or build setup.

---

## 1. Use a Development Build (Required)

**Local notifications do NOT work in Expo Go.**

| ✅ Required | ❌ Does not work |
|------------|------------------|
| `npx expo run:android` | `npx expo start` + scan QR in Expo Go |
| Development build installed on device | Expo Go app |

**Do this:**
```bash
cd duwunkyal-mobile
npm run prebuild:android
npx expo run:android
```

Install the built APK on a **physical Android device**. Do not use Expo Go.

---

## 2. Physical Device

Notifications typically do **not** show reliably on:
- Android emulator
- iOS simulator

Use a **real phone** for testing.

---

## 3. Notification Permission

When the app first asks for notification permission, choose **Allow**.

If you previously denied:
- **Android**: Settings → Apps → Duwunkyal → Notifications → **On**
- **iOS**: Settings → Duwunkyal → Notifications → Allow Notifications → **On**

---

## 4. Android: Pop on Screen

To see a heads-up notification bar at the top:
- Settings → Apps → Duwunkyal → Notifications
- Find **Order Updates** channel
- Turn **ON** "Pop on screen" / "Heads-up notifications"
- If you see **Miscellaneous** instead, enable "Pop on screen" there

---

## 5. Android: Battery Optimization

- Settings → Apps → Duwunkyal → Battery → **Unrestricted**
- Do not use "Restricted" or "Optimized"

---

## 6. Web / iOS Simulator

- **Web**: Notifications are skipped (web platform is not supported).
- **iOS Simulator**: May not show notifications; use a physical device.

---

## Quick Checklist

- [ ] App is built with `npx expo run:android` (NOT Expo Go)
- [ ] Running on a physical Android device
- [ ] Notification permission is **Allowed**
- [ ] Android: Order Updates → "Pop on screen" is ON
- [ ] Android: Battery → Unrestricted

---

## If It Still Does Not Show

1. Fully close the app and reopen.
2. Try placing an order again.
3. Check if the **Order Success** screen appears; if it does, the order was placed successfully and only the notification bar failed.
4. Rebuild the app: `npm run prebuild:android` then `npx expo run:android`.
