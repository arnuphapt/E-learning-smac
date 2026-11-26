declare module "@/lib/dragon/engine.mjs" {
  export interface DragonBaseCallbacks {
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
    onCamera?: (camera: unknown) => void;
    onInspect?: (item: unknown) => void;
    onInteract?: (event: { kind: string; actorId?: string; roomID?: string }) => void;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type DragonBaseApi = any;

  export function createBase(
    host: HTMLElement,
    options?: DragonBaseCallbacks
  ): Promise<DragonBaseApi>;
}

declare module "@/lib/dragon/game-reset.mjs" {
  export function resetGameDataOnce(
    storage: Storage,
    session?: Storage
  ): boolean;
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
  }>;
}

declare module "@/lib/dragon/native-expansion-status.mjs" {
  import type * as ReactNS from "react";
  export function createNativeExpansionStatus(
    React: typeof ReactNS
  ): ReactNS.ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any;
    roomID: string;
    onClose: () => void;
  }>;
}

declare module "@/lib/dragon/native-hud.mjs" {
  import type * as ReactNS from "react";
  export function createNativeHud(
    React: typeof ReactNS
  ): ReactNS.ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any;
    onOpenBook?: () => void;
    onOpenSettings?: () => void;
    onOpenCurrency?: (currency: "SC" | "HC") => void;
    settingsOpen?: boolean;
  }>;
}
