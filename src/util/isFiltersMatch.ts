import { MessageFilters, Port } from '../types';

export function isFiltersMatch(sender?: MessageFilters, filters?: MessageFilters) {
  if (!filters || !sender) {
    return true;
  }
  let matched = true;
  for (const k of Object.keys(filters)) {
    const value = (filters as any)[k];
    switch (k) {
      case 'groupId': {
        matched = value === sender.groupId;
        break;
      }
      case 'tabId': {
        matched = value === sender.tabId;
        break;
      }
      case 'windowId': {
        matched = value === sender.windowId;
        break;
      }
      case 'frameId': {
        matched = value === sender.frameId;
        break;
      }
      case 'origin': {
        matched = value === sender.origin;
        break;
      }
      case 'url': {
        matched = value === sender.url;
        break;
      }
    }
    if (!matched) {
      break;
    }
  }
  return matched;
}
