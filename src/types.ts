/**
 * Runtime contexts in browser
 */
export enum RuntimeContext {
  devtools = 'devtools',
  background = 'background',
  contentScript = 'contentScript',
  pageScript = 'pageScript',
  popup = 'popup',
}

/**
 * Message which crosses through the context
 */
export interface Message<T> {
  from: RuntimeContext;
  to: RuntimeContext;
  data: T;
  id: string;
  timestamp: number;
  filters?: MessageFilters;
  sender?: MessageFilters;
}

export interface MessageFilters {
  groupId?: string | number;
  tabId?: number;
  windowId?: number;
  origin?: string;
  url?: string;
  frameId?: number;
  devtoolsId?: string;
  className?: string;
}

export interface PortName {
  context: RuntimeContext;
  groupId?: string | number;
  devtoolsId?: string;
  className?: string;
}

export interface Port extends chrome.runtime.Port {
  groupId: string | number | undefined;
  context: RuntimeContext;
  devtoolsId: string | undefined;
  className: string | undefined;
}

export const GET_FRAME_LIST_MESSAGE_ID = '@@internal::GET_FRAME_LIST';
export interface FrameList {
  [RuntimeContext.contentScript]: MessageFilters[];
  [RuntimeContext.pageScript]: MessageFilters[];
  [RuntimeContext.devtools]: MessageFilters[];
}