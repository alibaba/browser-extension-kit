import { Log } from '../util/log';
import { RuntimeContext, Message, MessageFilters, GET_FRAME_LIST_MESSAGE_ID, FrameList } from '../types';
import { Subject } from 'rxjs';

export abstract class ClientScript {
  private originalPort?: chrome.runtime.Port;

  private listeningMessageIds: Array<{
    id: string;
    cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void;
    filters?: MessageFilters;
  }> = [];

  private pendingMessages: Message<unknown>[] = [];

  protected log = new Log(this.runtimeContext, this.constructor.name);

  protected frameList$ = new Subject<FrameList>();

  protected port = {
    background: <T>(id: string, data?: T) => {
      this.sendMessage(id, data, RuntimeContext.background);
    },
    contentScript: <T>(id: string, data?: T, filters?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.contentScript, filters);
    },
    devtools: <T>(id: string, data?: T, filters?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.devtools, filters);
    },
    pageScript: <T>(id: string, data?: T, filters?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.pageScript, filters);
    },
    popup: <T>(id: string, data?: T) => {
      this.sendMessage(id, data, RuntimeContext.popup);
    },
  };

  constructor(private runtimeContext: RuntimeContext) {
    this.on(GET_FRAME_LIST_MESSAGE_ID, data => {
      this.frameList$.next(data as FrameList);
    });
  }

  protected on(
    id: string,
    cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void,
    filters?: MessageFilters
  ) {
    this.listeningMessageIds.push({ id, cb, filters });
  }

  private sendMessage<T>(id: string, data: T, context: RuntimeContext, filters?: MessageFilters) {
    const message: Message<T> = {
      from: this.runtimeContext,
      to: context,
      data,
      id,
      timestamp: Date.now(),
      filters,
    };
    if (this.originalPort) {
      this.originalPort.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }
}
