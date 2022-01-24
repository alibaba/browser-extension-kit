import { Message, RuntimeContext, MessageFilters, PortName, GET_FRAME_LIST_MESSAGE_ID } from '../types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReplaySubject, Subject } from 'rxjs';
import { isFiltersMatch } from './isFiltersMatch';

export default class Connect {
  private port?: chrome.runtime.Port;

  private messageRecord = new Map<string, Subject<Message<unknown>>>();

  private messageListeners = new Map<
    string,
    Array<(data: any, sender: MessageFilters | undefined, timestamp: number) => void>
  >();

  private devtoolsId = [...Array(30)].map(() => Math.random().toString(36)[2]).join('');

  constructor(private runtimeContext: RuntimeContext, private groupId?: string | number) {
    const portName: PortName = {
      context: runtimeContext,
      groupId,
    };
    if (runtimeContext === RuntimeContext.devtools) {
      portName.devtoolsId = this.devtoolsId;
    }
    this.port = chrome.runtime.connect({ name: JSON.stringify(portName) });

    this.port.onMessage.addListener(this.handleMessage);
    this.port?.onDisconnect.addListener(port => {
      port.onMessage.removeListener(this.handleMessage);
      this.port = undefined;
    });
  }

  private handleMessage = (message: Message<unknown>) => {
    if (!this.messageRecord.has(message.id)) {
      this.messageRecord.set(message.id, new ReplaySubject(1));
    }
    this.messageRecord.get(message.id)?.next(message);
    const listeners = this.messageListeners.get(message.id);
    if (listeners) {
      listeners.forEach(cb => cb(message.data, message.sender, message.timestamp));
    }
  };

  private sendMessage(context: RuntimeContext) {
    return <M>(id: string, msg?: M, filters?: MessageFilters) => {
      const formattedMsg: Message<M> = {
        from: this.runtimeContext,
        to: context,
        id,
        data: msg!,
        timestamp: Date.now(),
        filters,
      };
      this.port?.postMessage(formattedMsg);
    };
  }

  useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined] {
    const [state, setState] = useState<T>(initialValue as any);
    const [sender, setSender] = useState<MessageFilters>();

    useEffect(() => {
      if (!this.messageRecord.has(id)) {
        this.messageRecord.set(id, new ReplaySubject(1));
      }
      const subscription = this.messageRecord.get(id)?.subscribe(message => {
        if (isFiltersMatch(message.sender, filters)) {
          setState(message.data as any);
          setSender(message.sender);
        }
      });
      return () => {
        subscription?.unsubscribe();
      };
    }, [filters, id]);

    return [state, sender];
  }

  useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools) {
    const [frameList, setFrameList] = useState<MessageFilters[]>([]);

    useEffect(() => {
      if (!this.messageRecord.has(GET_FRAME_LIST_MESSAGE_ID)) {
        this.messageRecord.set(GET_FRAME_LIST_MESSAGE_ID, new ReplaySubject(1));
      }
      const subscription = this.messageRecord.get(GET_FRAME_LIST_MESSAGE_ID)?.subscribe(message => {
        setFrameList(((message.data as any)?.[context] ?? []) as MessageFilters[]);
      });
      return () => {
        subscription?.unsubscribe();
      };
    }, [context]);

    return [frameList];
  }

  usePostMessage() {
    return useMemo(() => {
      const data: {
        background: <M>(id: string, msg?: M, filters?: MessageFilters) => void;
        contentScript: <M>(id: string, msg?: M, filters?: MessageFilters) => void;
        devtools: <M>(id: string, msg?: M, filters?: MessageFilters) => void;
        pageScript: <M>(id: string, msg?: M, filters?: MessageFilters) => void;
        popup: <M>(id: string, msg?: M, filters?: MessageFilters) => void;
        on: (id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void) => void;
        off: (id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void) => void;
        devtoolsId?: string;
      } = {
        background: this.sendMessage(RuntimeContext.background),
        contentScript: this.sendMessage(RuntimeContext.contentScript),
        devtools: this.sendMessage(RuntimeContext.devtools),
        pageScript: this.sendMessage(RuntimeContext.pageScript),
        popup: this.sendMessage(RuntimeContext.popup),
        on: (id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void) => {
          if (!this.messageListeners.has(id)) {
            this.messageListeners.set(id, []);
          }
          this.messageListeners.get(id)?.push(cb);
        },
        off: (id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void) => {
          const listeners = this.messageListeners.get(id);
          if (listeners) {
            const index = listeners.findIndex(i => i === cb);
            listeners.splice(index, 1);
          }
        },
      };
      if (this.runtimeContext === RuntimeContext.devtools) {
        data.devtoolsId = this.devtoolsId;
      }
      return data;
    }, []);
  }
}
