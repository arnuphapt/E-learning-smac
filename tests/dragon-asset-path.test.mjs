import test from "node:test";
import assert from "node:assert/strict";
import { resolveDragonAssetKey } from "../lib/dragon-asset-path.ts";

test("resolveDragonAssetKey accepts valid relative dragon asset paths", () => {
  const cases = [
    [
      ["generated", "hatching", "catalog.json"],
      "dragon/generated/hatching/catalog.json",
    ],
    [
      ["assets", "Texture2D", "Wyvern_2.webp"],
      "dragon/assets/Texture2D/Wyvern_2.webp",
    ],
    [
      ["assets", "TextAsset", "Wyvern_2.atlas.txt"],
      "dragon/assets/TextAsset/Wyvern_2.atlas.txt",
    ],
    [
      ["assets", "TextAsset", "Wyvern_2.skel.bytes"],
      "dragon/assets/TextAsset/Wyvern_2.skel.bytes",
    ],
    [
      ["assets", "Font", "Poppins-Bold.ttf"],
      "dragon/assets/Font/Poppins-Bold.ttf",
    ],
    [["CREDITS.md"], "dragon/CREDITS.md"],
  ];

  for (const [segments, expected] of cases) {
    const key = resolveDragonAssetKey(segments);
    assert.equal(key, expected);
    assert.ok(key?.startsWith("dragon/"));
  }
});

test("resolveDragonAssetKey rejects traversal, bad slashes, empty segments, and disallowed extensions", () => {
  const invalid = [
    undefined,
    null,
    [],
    [""],
    ["assets", "", "Wyvern_2.webp"],
    ["..", "secret.json"],
    ["assets", "..", "secret.json"],
    ["%2e%2e", "secret.json"],
    ["%2E%2E", "secret.json"],
    ["a..b.json"],
    ["assets\\Texture2D\\Wyvern_2.webp"],
    ["/generated/hatching/catalog.json"],
    ["assets/Texture2D", "Wyvern_2.webp"],
    ["no-extension"],
    [".hidden"],
    ["assets", "bad.exe"],
    ["assets", "bad.js"],
    ["assets", "bad.png"],
    ["%ZZ.json"],
  ];

  for (const segments of invalid) {
    assert.equal(resolveDragonAssetKey(segments), null);
  }
});
