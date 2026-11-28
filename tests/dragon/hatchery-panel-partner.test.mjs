import test from "node:test";
import assert from "node:assert/strict";
import { getPartnerControlState } from "../../lib/dragon/hatchery-panel.mjs";

test("getPartnerControlState shows nothing when allowPartner is false", () => {
  assert.equal(
    getPartnerControlState({
      allowPartner: false,
      dragon: { id: "d1", isPartner: false },
    }),
    null
  );
  assert.equal(
    getPartnerControlState({
      allowPartner: false,
      dragon: { id: "d1", isPartner: true },
    }),
    null
  );
});

test("getPartnerControlState shows 'คู่ใจ' label for current partner and button otherwise", () => {
  assert.deepEqual(
    getPartnerControlState({
      allowPartner: true,
      dragon: { id: "d1", isPartner: true },
    }),
    { kind: "label", label: "คู่ใจ" }
  );

  assert.deepEqual(
    getPartnerControlState({
      allowPartner: true,
      dragon: { id: "d2", isPartner: false },
    }),
    {
      kind: "button",
      label: "เลือกเป็นคู่ใจ",
      ariaLabel: "เลือกเป็นมังกรคู่ใจ",
      disabled: false,
    }
  );
});

test("getPartnerControlState disables button and shows pending text while request is in flight", () => {
  assert.deepEqual(
    getPartnerControlState({
      allowPartner: true,
      dragon: { id: "d2", isPartner: false },
      partnerPendingId: "d2",
    }),
    {
      kind: "button",
      label: "กำลังตั้ง…",
      ariaLabel: "เลือกเป็นมังกรคู่ใจ",
      disabled: true,
    }
  );

  assert.deepEqual(
    getPartnerControlState({
      allowPartner: true,
      dragon: { id: "d3", isPartner: false },
      partnerPendingId: "d2",
    }),
    {
      kind: "button",
      label: "เลือกเป็นคู่ใจ",
      ariaLabel: "เลือกเป็นมังกรคู่ใจ",
      disabled: true,
    }
  );
});
