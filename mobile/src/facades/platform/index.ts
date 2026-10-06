import { PlatformFacadeImpl } from './PlatformFacadeImpl';
import type { PlatformFacade } from './PlatformFacade';

export type { PlatformFacade } from './PlatformFacade';
export { PlatformFacadeImpl } from './PlatformFacadeImpl';

/** Single instance the whole app shares - mirrors `jobWorkspaceFacade`. */
export const platformFacade: PlatformFacade = new PlatformFacadeImpl();
