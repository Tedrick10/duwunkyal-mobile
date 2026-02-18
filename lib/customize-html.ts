/**
 * Load customize HTML and inject image URIs for local (no-server) mode.
 * Uses base64 data URIs so WebView can load images regardless of origin.
 */
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

const IMAGE_FRONT_PLACEHOLDER = "__IMAGE_FRONT__";
const IMAGE_BACK_PLACEHOLDER = "__IMAGE_BACK__";
const OBJ_URL_PLACEHOLDER = "__OBJ_URL__";

async function getImageAsDataUri(
  assetModule: number
): Promise<string> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) return "";
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  return base64 ? `data:image/png;base64,${base64}` : "";
}

async function getObjAssetUri(): Promise<string> {
  return "";
}

export async function getLocalCustomizeHtml(): Promise<string> {
  const [htmlAsset, objUri, frontImg, backImg] = await Promise.all([
    (async () => {
      const a = Asset.fromModule(require("@/assets/customize/customize.html"));
      await a.downloadAsync();
      return a.localUri ?? a.uri;
    })(),
    getObjAssetUri(),
    getImageAsDataUri(require("@/assets/products/tshirt-front.png")),
    getImageAsDataUri(require("@/assets/products/tshirt-back.png")),
  ]);

  if (!htmlAsset) {
    throw new Error("Failed to load customize HTML");
  }

  const html = await FileSystem.readAsStringAsync(htmlAsset, {
    encoding: "utf8",
  });

  return html
    .replace(IMAGE_FRONT_PLACEHOLDER, frontImg || "")
    .replace(IMAGE_BACK_PLACEHOLDER, backImg || "")
    .replace(OBJ_URL_PLACEHOLDER, objUri || "");
}
