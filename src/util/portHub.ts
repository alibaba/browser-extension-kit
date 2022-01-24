import { ReplaySubject, map, merge, of, shareReplay, Subject } from 'rxjs';
import { RuntimeContext, Port, MessageFilters, Message, GET_FRAME_LIST_MESSAGE_ID } from '../types';
import { portToMessageFilters } from '../util/portToMessageFilters';

export type PortStore = Map<RuntimeContext, Set<Port>>;

class PortHub {
  static fakeBackgroundPort = { '@@fakeBackgroundPort': true, context: RuntimeContext.background } as unknown as Port;

  static frameListSubject = new Subject<PortStore>();

  static frameList = merge(
    of(
      new Map<RuntimeContext, Set<Port>>([
        [RuntimeContext.background, new Set()],
        [RuntimeContext.pageScript, new Set()],
        [RuntimeContext.contentScript, new Set()],
        [RuntimeContext.popup, new Set()],
        [RuntimeContext.devtools, new Set()],
      ])
    ),
    PortHub.frameListSubject
  ).pipe(
    map(data => ({
      [RuntimeContext.contentScript]: Array.from(data.get(RuntimeContext.contentScript)!.values()).map(port =>
        portToMessageFilters(port)
      ),
      [RuntimeContext.pageScript]: Array.from(data.get(RuntimeContext.pageScript)!.values()).map(port =>
        portToMessageFilters(port)
      ),
      [RuntimeContext.devtools]: Array.from(data.get(RuntimeContext.devtools)!.values()).map(port =>
        portToMessageFilters(port)
      ),
    })),
    shareReplay(1)
  );

  private portStore: PortStore = new Map<RuntimeContext, Set<Port>>([
    [RuntimeContext.background, new Set()],
    [RuntimeContext.pageScript, new Set()],
    [RuntimeContext.contentScript, new Set()],
    [RuntimeContext.popup, new Set()],
    [RuntimeContext.devtools, new Set()],
  ]);

  private messageStore = new Map<Port, Map<string, ReplaySubject<Message<unknown>>>>([
    [PortHub.fakeBackgroundPort, new Map()],
  ]);

  private subjectListeners = new Map<
    Port,
    Array<(messageId: string, subject: ReplaySubject<Message<unknown>>) => void>
  >();

  private pendingSearchPortTask: Array<{
    context: RuntimeContext;
    filters: MessageFilters;
    cb: (ports: Port[]) => void;
  }> = [];

  constructor() {
    this.portStore.get(RuntimeContext.background)?.add(PortHub.fakeBackgroundPort);

    PortHub.frameList.subscribe(data => {
      Object.keys(RuntimeContext).forEach(k => {
        const message: Message<typeof data> = {
          from: RuntimeContext.background,
          to: k as RuntimeContext,
          data,
          id: GET_FRAME_LIST_MESSAGE_ID,
          timestamp: Date.now(),
        };
        this.findPort(k as RuntimeContext, {}, ports => {
          ports.forEach(port => {
            this.getSubject(port, GET_FRAME_LIST_MESSAGE_ID)?.next(message);
          });
        });
      });
    });
  }

  findPort(
    context: RuntimeContext,
    filters: MessageFilters,
    cb: (ports: Port[]) => void,
    addToPendingTaskList?: boolean
  ): void;
  findPort(context: RuntimeContext, filters: MessageFilters): Port[];
  findPort(
    context: RuntimeContext,
    filters: MessageFilters,
    cb?: (ports: Port[]) => void,
    addToPendingTaskList = true
  ) {
    const ports = Array.from(this.portStore.get(context)!.values()).filter(port => {
      let matched = true;
      for (const k of Object.keys(filters)) {
        const value = (filters as any)[k];
        switch (k) {
          case 'groupId': {
            matched = value === port.groupId;
            break;
          }
          case 'tabId': {
            matched = value === port.sender?.tab?.id;
            break;
          }
          case 'windowId': {
            matched = value === port.sender?.tab?.windowId;
            break;
          }
          case 'frameId': {
            matched = value === port.sender?.frameId;
            break;
          }
          case 'origin': {
            matched = value === port.sender?.origin;
            break;
          }
          case 'url': {
            matched = value === port.sender?.url;
            break;
          }
          case 'devtoolsId': {
            matched = value === port.devtoolsId;
            break;
          }
          case 'className': {
            matched = value === port.className;
            break;
          }
        }
        if (!matched) {
          break;
        }
      }
      return matched;
    });
    if (cb) {
      if (ports.length > 0) {
        cb(ports);
      } else if (addToPendingTaskList) {
        this.pendingSearchPortTask.push({ context, filters, cb });
      }
    } else {
      return ports;
    }
  }

  setPort(context: RuntimeContext, port: Port) {
    if ([RuntimeContext.background, RuntimeContext.popup].includes(context)) {
      for (const [p, messageMap] of this.messageStore.entries()) {
        if (p.context === context) {
          this.messageStore.set(port, messageMap);
          this.messageStore.delete(p);
          break;
        }
      }
      for (const [p, listeners] of this.subjectListeners.entries()) {
        if (p.context === context) {
          this.subjectListeners.set(port, listeners);
          this.subjectListeners.delete(p);
          break;
        }
      }
    }
    this.portStore.get(context)?.add(port);
    const pendingRemovedTask: number[] = [];
    this.pendingSearchPortTask.forEach((task, index) => {
      this.findPort(
        task.context,
        task.filters,
        (ports: Port[]) => {
          task.cb(ports);
          pendingRemovedTask.push(index);
        },
        false
      );
    });
    this.pendingSearchPortTask = this.pendingSearchPortTask.filter((_, index) => !pendingRemovedTask.includes(index));
    PortHub.frameListSubject.next(this.portStore);
  }

  deletePort(context: RuntimeContext, port: Port) {
    this.portStore.get(context)?.delete(port);
    if ([RuntimeContext.contentScript, RuntimeContext.pageScript, RuntimeContext.devtools].includes(context)) {
      for (const [p] of this.messageStore.entries()) {
        if (p.context === context) {
          this.messageStore.delete(p);
        }
      }
      for (const [p] of this.subjectListeners.entries()) {
        if (p.context === context) {
          this.subjectListeners.delete(p);
          break;
        }
      }
    }
    PortHub.frameListSubject.next(this.portStore);
  }

  getSubject(port: Port, messageId: string) {
    this.guard(port, messageId);
    return this.find(this.messageStore, port)?.get(messageId);
  }

  getAllSubjcts(port: Port) {
    this.guard(port);
    return this.find(this.messageStore, port);
  }

  onAddNewSubject(port: Port, cb: (messageId: string, subject: ReplaySubject<Message<unknown>>) => void) {
    if (!this.find(this.subjectListeners, port)) {
      this.subjectListeners.set(port, []);
    }
    this.find(this.subjectListeners, port)?.push(cb);
  }

  private guard(port: Port, messageId?: string) {
    if (!this.find(this.messageStore, port)) {
      this.messageStore.set(port, new Map());
    }
    const messageMap = this.find(this.messageStore, port)!;
    if (messageId && !messageMap.has(messageId)) {
      const subject = new ReplaySubject<Message<unknown>>(1);
      messageMap.set(messageId, subject);

      if (Array.isArray(this.find(this.subjectListeners, port))) {
        this.find(this.subjectListeners, port)?.forEach(cb => {
          cb(messageId, subject);
        });
      }
    }
  }

  private find<T>(data: Map<Port, T>, port: Port) {
    return data.get(port);
  }
}

export const portHub = new PortHub();
