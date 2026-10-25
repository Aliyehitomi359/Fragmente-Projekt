import type { Fragment } from './types';

export const DEFAULT_BOX_ID = 'default-box';

export function fragmentBoxIds(fragment: Pick<Fragment, 'boxId' | 'boxIds'>): string[] {
  const ids = [...new Set((fragment.boxIds ?? [fragment.boxId]).filter(Boolean))];
  return ids.length ? ids : [DEFAULT_BOX_ID];
}

export function withFragmentBoxes<T extends Pick<Fragment, 'boxId' | 'boxIds'>>(fragment: T, ids: string[]): T {
  const boxIds = [...new Set(ids.filter(Boolean))];
  if (!boxIds.length) boxIds.push(DEFAULT_BOX_ID);
  return { ...fragment, boxId: boxIds[0], boxIds };
}
