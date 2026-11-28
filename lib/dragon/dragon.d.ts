declare module "@/lib/dragon/asset-base.mjs" {
  export function assetUrl(path: string): string;
}

declare module "@/lib/dragon/hatchery.mjs" {
  export const HATCHERY_KEY: string;
}

declare module "@/lib/dragon/engine.mjs" {
  export interface DragonBaseCallbacks {
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
    onCamera?: (camera: unknown) => void;
    onInspect?: (item: unknown) => void;
    onInteract?: (event: { kind: string; actorId?: string; roomID?: string }) => void;
    storage?: Pick<Storage, "getItem" | "setItem"> | null;
    viewOnly?: boolean;
    allowHatch?: boolean;
    allowSummon?: boolean;
    allowPartner?: boolean;
    allowAdultDrag?: boolean;
    fogEnabled?: boolean;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type DragonBaseApi = any;

  export function createBase(
    host: HTMLElement,
    options?: DragonBaseCallbacks
  ): Promise<DragonBaseApi>;
}

declare module "@/lib/dragon/hatchery-panel.mjs" {
  import type * as ReactNS from "react";
  export function createHatcheryFeature(
    React: typeof ReactNS
  ): ReactNS.ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any;
    interaction: { kind: string; actorId?: string; roomID?: string } | null;
    open: boolean;
    onClose?: () => void;
    nurseryOnly?: boolean;
    storage?: Pick<Storage, "getItem" | "setItem"> | null;
    viewOnly?: boolean;
    allowHatch?: boolean;
    allowSummon?: boolean;
    allowSummonTick?: boolean;
    allowPartner?: boolean;
    partnerPendingId?: string | null;
    onHatch?: (dragonId: string) => Promise<boolean | void> | boolean | void;
    onHatchNotReady?: (dragonId: string) => void;
    onHatchComplete?: (dragonId: string) => void;
    onSummonRequest?: () => void;
    onPartnerRequest?: (dragonId: string) => void;
    onSnapshot?: (snapshot: { active?: { id: string; status: string } | null }) => void;
  }>;
}

declare module "@/lib/dragon/podium-renderer.mjs" {
  export interface PodiumEntryGroup {
    id: string;
    expectedAdults: number;
  }

  export function mountPodiumDragon(
    host: HTMLElement,
    options: {
      speciesId: string;
      stage: "egg" | "baby" | "adult";
      place?: 1 | 2 | 3;
      isPartner?: boolean;
      entryGroup?: PodiumEntryGroup;
      signal?: AbortSignal;
    }
  ): Promise<() => void>;

  export interface QuizPartnerRect {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  export interface QuizPartnerDragonController {
    flyTo: (rect: QuizPartnerRect) => void;
    reposition: (rect: QuizPartnerRect) => void;
    takeOff: () => void;
    destroy: () => void;
  }

  export function mountQuizPartnerDragon(
    host: HTMLElement,
    options: {
      speciesId: string;
      isPartner?: boolean;
      signal?: AbortSignal;
    }
  ): Promise<QuizPartnerDragonController | null>;
}
