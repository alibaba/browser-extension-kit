import { Port, MessageFilters } from '../types';

export function portToMessageFilters(port: Port): MessageFilters {
  return {
    groupId: port.groupId,
    tabId: port.sender?.tab?.id,
    windowId: port.sender?.tab?.windowId,
    origin: port.sender?.origin,
    url: port.sender?.url,
    frameId: port.sender?.frameId,
    devtoolsId: port.devtoolsId,
    className: port.className,
  };
}
