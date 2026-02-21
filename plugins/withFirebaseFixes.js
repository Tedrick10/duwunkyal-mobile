/**
 * Config plugin to fix Firebase + Expo notifications build issues:
 * 1. Android: Manifest merger conflict on default_notification_color (add tools:replace)
 * 2. iOS: GoogleUtilities modular headers for Swift/static libs
 */
const { withAndroidManifest, withPodfile } = require("@expo/config-plugins");

const FIREBASE_COLOR_KEY = "com.google.firebase.messaging.default_notification_color";

function withFirebaseManifestMerge(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApps = androidManifest?.manifest?.application;
    const applications = Array.isArray(mainApps) ? mainApps : mainApps ? [mainApps] : [];
    for (const mainApp of applications) {
      if (!mainApp || !mainApp["meta-data"]) continue;
      const metaData = mainApp["meta-data"];
      const items = Array.isArray(metaData) ? metaData : [metaData];
      for (const m of items) {
        if (m?.$?.["android:name"] === FIREBASE_COLOR_KEY) {
          m.$["tools:replace"] = "android:resource";
          const root = androidManifest.manifest || androidManifest;
          if (!root.$) root.$ = {};
          root.$["xmlns:tools"] = "http://schemas.android.com/tools";
          break;
        }
      }
    }
    return config;
  });
}

function withFirebasePodfile(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    const targetBlock = "target 'DUWUNKYAL' do";
    const insertLine = "  $RNFirebaseAsStaticFramework = true\n  pod 'GoogleUtilities', :modular_headers => true\n";
    if (contents.includes(targetBlock) && !contents.includes("$RNFirebaseAsStaticFramework")) {
      contents = contents.replace(
        targetBlock,
        targetBlock + "\n" + insertLine
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withFirebaseFixes(config) {
  config = withFirebaseManifestMerge(config);
  config = withFirebasePodfile(config);
  return config;
};
