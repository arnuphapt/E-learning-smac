import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Skin } from "@esotericsoftware/spine-core";
import { parseNPCMixSource } from "../../lib/dragon/npc-mixer.mjs";
import { resolveAdultSkin } from "../../lib/dragon/adult-animation.mjs";
import { createSpineActor } from "../../lib/dragon/spine-actor.mjs";

const CATALOG_PATH = path.resolve("public/dragon/generated/hatching/catalog.json");

function loadFamilySkeleton(catalog, familyName) {
  const cfg = catalog.adult.families[familyName];
  const atlasText = fs.readFileSync(
    path.resolve("public/dragon", cfg.atlasUrl.replace(/^\/+/, "")),
    "utf8"
  );
  const binary = new Uint8Array(
    fs.readFileSync(path.resolve("public/dragon", cfg.binaryUrl.replace(/^\/+/, "")))
  );
  return parseNPCMixSource({ atlasText, binary, config: {} }).skeletonData;
}

test("resolveAdultSkin returns plain id for non-partner and composed base+Max Skin for partner", (t) => {
  if (!fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  // 001 (Wyvern_2)
  const sp001 = catalog.species.find((s) => s.id === "001");
  const skel001 = loadFamilySkeleton(catalog, sp001.adultFamily);
  assert.equal(resolveAdultSkin(skel001, "001", false), "001");

  const partner001 = resolveAdultSkin(skel001, "001", true);
  assert.ok(partner001 instanceof Skin);
  assert.equal(partner001.name, "001+Max");

  const earAIndex = skel001.findSlot("EarA").index;
  const earBIndex = skel001.findSlot("EarB").index;
  assert.equal(partner001.getAttachment(earAIndex, "EarA")?.name, "001/EarAGold");
  assert.equal(partner001.getAttachment(earBIndex, "EarB")?.name, "001/EarBGold");
  assert.ok(
    partner001.getAttachments().length >= skel001.findSkin("001").getAttachments().length,
    "composed skin preserves base attachments"
  );

  // 002 (Flower_1)
  const sp002 = catalog.species.find((s) => s.id === "002");
  const skel002 = loadFamilySkeleton(catalog, sp002.adultFamily);
  assert.equal(resolveAdultSkin(skel002, "002", false), "002");

  const partner002 = resolveAdultSkin(skel002, "002", true);
  assert.ok(partner002 instanceof Skin);
  assert.equal(partner002.name, "002+Max");
  const maxEntries002 = skel002.findSkin("002Max").getAttachments();
  for (const entry of maxEntries002) {
    assert.equal(
      partner002.getAttachment(entry.slotIndex, entry.name)?.name,
      entry.attachment.name
    );
  }
});

test("createSpineActor.setSkin switches between plain and partner Max skin in place", (t) => {
  if (!fs.existsSync(CATALOG_PATH)) {
    t.skip("public/dragon assets are not built");
    return;
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const sp001 = catalog.species.find((s) => s.id === "001");
  const skel001 = loadFamilySkeleton(catalog, sp001.adultFamily);
  const mockPixi = { Container: class { addChild() {} } };

  const actor = createSpineActor(mockPixi, {
    skeletonData: skel001,
    skin: resolveAdultSkin(skel001, "001", false),
    textures: new Map(),
    pages: catalog.adult.families[sp001.adultFamily].pages,
  });
  assert.equal(actor.skeleton.skin.name, "001");

  actor.setSkin(resolveAdultSkin(skel001, "001", true));
  assert.equal(actor.skeleton.skin.name, "001+Max");
  assert.equal(actor.skeleton.getAttachmentByName("EarA", "EarA")?.name, "001/EarAGold");

  actor.setSkin(resolveAdultSkin(skel001, "001", false));
  assert.equal(actor.skeleton.skin.name, "001");
  assert.notEqual(actor.skeleton.getAttachmentByName("EarA", "EarA")?.name, "001/EarAGold");
});
