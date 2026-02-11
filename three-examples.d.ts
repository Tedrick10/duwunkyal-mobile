declare module "three/examples/jsm/loaders/OBJLoader.js" {
  import type { Group, Loader, LoadingManager } from "three";
  export class OBJLoader extends Loader<Group> {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (obj: Group) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (err: unknown) => void
    ): void;
    parse(data: string): Group;
  }
}
