const fs = require("fs");
const path = require("path");

const buildGradlePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@metamask",
  "sdk-react-native",
  "android",
  "build.gradle",
);

const kotlinModulePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@metamask",
  "sdk-react-native",
  "android",
  "src",
  "main",
  "java",
  "io",
  "metamask",
  "reactnativesdk",
  "MetaMaskReactNativeSdkModule.kt",
);

const patchFile = (filePath, transforms) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const original = fs.readFileSync(filePath, "utf8");
  let updated = original;

  for (const [pattern, replacement] of transforms) {
    updated = updated.replace(pattern, replacement);
  }

  if (updated === original) {
    return false;
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
};

const gradlePatched = patchFile(buildGradlePath, [
  [/JavaVersion\.VERSION_11/g, "JavaVersion.VERSION_17"],
  [/jvmTarget = "11"/g, 'jvmTarget = "17"'],
]);

const kotlinPatched = patchFile(kotlinModulePath, [
  [
    /val req = reqArray\.getMap\(i\)/g,
    'val req = reqArray.getMap(i) ?: throw IllegalArgumentException("Request is required")',
  ],
  [
    /ReadableType\.Map -> this\.asMap\(\)\.toHashMap\(\)/g,
    "ReadableType.Map -> this.asMap()?.toHashMap()",
  ],
  [
    /ReadableType\.Array -> this\.asArray\(\)\.toArrayList\(\)/g,
    "ReadableType.Array -> this.asArray()?.toArrayList()",
  ],
]);

if (!fs.existsSync(buildGradlePath) && !fs.existsSync(kotlinModulePath)) {
  console.log(
    "[patch-metamask-android] MetaMask Android sources not found, skipping.",
  );
  process.exit(0);
}

if (!gradlePatched && !kotlinPatched) {
  console.log("[patch-metamask-android] No changes needed.");
  process.exit(0);
}

console.log(
  "[patch-metamask-android] Patched MetaMask Android sources for Expo SDK 54 compatibility.",
);
