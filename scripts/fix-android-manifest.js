/**
 * Fixes Android manifest merger conflict: add tools:replace to Firebase default_notification_color.
 * Run after prebuild: npx expo prebuild --clean && node scripts/fix-android-manifest.js
 */
const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml");
if (!fs.existsSync(manifestPath)) {
  console.log("Android manifest not found, skipping fix");
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, "utf8");
const oldMeta =
  '<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color"/>';
const newMeta =
  '<meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/notification_icon_color" tools:replace="android:resource"/>';

let changed = false;
if (xml.includes(oldMeta) && !xml.includes('tools:replace="android:resource"')) {
  xml = xml.replace(oldMeta, newMeta);
  changed = true;
  console.log("Applied tools:replace fix to AndroidManifest.xml");
} else {
  console.log("Firebase meta fix not needed or already applied");
}

// App only uses images (expo-image-picker mediaTypes: images); drop video/audio read per Play policy.
const stripPerms = [
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
];
for (const name of stripPerms) {
  const re = new RegExp(
    `<uses-permission\\s+android:name="${name.replace(/\./g, "\\.")}"\\s*/>\\s*`,
    "g"
  );
  const next = xml.replace(re, "");
  if (next !== xml) {
    xml = next;
    changed = true;
    console.log(`Removed ${name} from AndroidManifest.xml`);
  }
}
if (changed) {
  fs.writeFileSync(manifestPath, xml);
} else {
  console.log("Android manifest: no changes required");
}
