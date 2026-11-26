export interface BabyMoveState {
  kind: "egg" | "baby";
  babyId: string | null;
  speciesId: string;
  targetSlotGUIDs: string[];
}

export interface BabyMoveTarget {
  kind?: "egg" | "baby";
  babyId?: string;
  id?: string;
}

interface HatcheryModelLike {
  canMove(): boolean;
  getSnapshot(): {
    active?: { status?: string; speciesId: string } | null;
    babies: Array<{ id: string; speciesId: string; maturing?: unknown }>;
  };
  getEmptySlots(): Array<{ GUID: string }>;
  move(slotGUID: string): void;
  moveBaby(babyId: string, slotGUID: string): void;
}

interface HatcheryRendererLike {
  setBabyMoving?(babyId: string, moving: boolean): void;
  setTransitSlots?(slots: string[]): void;
}

export function createBabyMoveController({
  getModel,
  renderer,
  setState = () => {},
  onAfterSuccess = () => {},
  onError = () => {},
}: {
  getModel?: () => HatcheryModelLike | null | undefined;
  renderer?: HatcheryRendererLike | null;
  setState?: (next: BabyMoveState | null) => void;
  onAfterSuccess?: (current: BabyMoveState, slotGUID: string) => void;
  onError?: (err: unknown) => void;
}) {
  let state: BabyMoveState | null = null;
  const sync = (next: BabyMoveState | null) => {
    state = next;
    setState(next);
  };

  return {
    get state() {
      return state;
    },
    begin(target?: BabyMoveTarget | string) {
      const model = getModel?.();
      if (!model || !model.canMove()) return false;
      const snap = model.getSnapshot();
      const isEgg = (typeof target === "object" ? target?.kind === "egg" : target === "egg");
      const babyId = isEgg
        ? null
        : typeof target === "string"
          ? target
          : (target?.babyId ?? target?.id ?? null);
      let speciesId: string | null = null;
      if (isEgg) {
        if (snap.active?.status !== "hatched" || !snap.active.speciesId) return false;
        speciesId = snap.active.speciesId;
      } else {
        const baby = snap.babies.find((b) => b.id === babyId);
        if (!baby || baby.maturing) return false;
        speciesId = baby.speciesId;
      }
      const slots = model.getEmptySlots().map((s) => s.GUID);
      if (!slots.length) return false;
      const next: BabyMoveState = { kind: isEgg ? "egg" : "baby", babyId, speciesId, targetSlotGUIDs: slots };
      if (babyId) renderer?.setBabyMoving?.(babyId, true);
      renderer?.setTransitSlots?.(slots);
      sync(next);
      return true;
    },
    cancel() {
      if (!state) return false;
      if (state.babyId) renderer?.setBabyMoving?.(state.babyId, false);
      renderer?.setTransitSlots?.([]);
      sync(null);
      return true;
    },
    drop(slotGUID?: string) {
      if (!state || !slotGUID || !state.targetSlotGUIDs.includes(slotGUID)) return false;
      const current = state;
      const model = getModel?.();
      try {
        if (!model) throw Error("ไม่พบระบบรังมังกร");
        if (current.kind === "egg") model.move(slotGUID);
        else if (current.babyId) model.moveBaby(current.babyId, slotGUID);
        if (current.babyId) renderer?.setBabyMoving?.(current.babyId, false);
        renderer?.setTransitSlots?.([]);
        sync(null);
        onAfterSuccess(current, slotGUID);
        return true;
      } catch (err) {
        if (current.babyId) renderer?.setBabyMoving?.(current.babyId, false);
        renderer?.setTransitSlots?.([]);
        sync(null);
        onError(err);
        return false;
      }
    },
  };
}
