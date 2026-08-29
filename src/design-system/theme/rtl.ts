import createCache from '@emotion/cache';
import stylisRTLPlugin from 'stylis-plugin-rtl';

export function createRtlCache() {
  return createCache({
    key: 'muirtl',
    stylisPlugins: [stylisRTLPlugin],
  });
}

export function createLtrCache() {
  return createCache({
    key: 'muiltr',
    stylisPlugins: [],
  });
}
