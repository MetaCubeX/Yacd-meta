/**
 * Browser polyfill for Node's `Buffer` global.
 *
 * `iconv-lite` (used by the qqwry reader) depends on `safer-buffer`, which
 * reads `Buffer.prototype` at module-evaluation time. In a browser bundle
 * the Node `Buffer` global is undefined, so that import crashes before our
 * code runs. Installing the `buffer` npm package and exposing it as a
 * global at the earliest possible point fixes it.
 *
 * Import this module (for side effects) at the very top of the entry
 * script, before any other module that transitively imports iconv-lite.
 */

import { Buffer } from 'buffer';

if (typeof (globalThis as { Buffer?: unknown }).Buffer === 'undefined') {
	(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

export { Buffer };
