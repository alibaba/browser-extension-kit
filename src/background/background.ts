import { Log } from '../util/log';
import { RuntimeContext, Message, GET_FRAME_LIST_MESSAGE_ID, MessageFilters, FrameList } from '../types';
import { portHub, PortStore } from '../util/portHub';
import { bootstrap, messageLog } from './internal';
import { Subject } from 'rxjs';

/**
 * An abstract class you must inherit from when you do something with background.
 */
export abstract class Background {
  static frameListSubject = new Subject<PortStore>();

  static bootstrap = bootstrap;

  /**
   * Log utils you can use for this instance.
   *
   * @protected
   * @memberof Background
   */
  protected log = new Log(RuntimeContext.background, this.constructor.name);

  protected frameList$ = new Subject<FrameList>();

  /**
   * Port you use to send messages to other contexts.
   *
   * @protected
   * @memberof Background
   */
  protected port = {
    background: <T>(id: string, data?: T) => {
      this.sendMessage(id, data, RuntimeContext.background);
    },
    contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.contentScript, filter);
    },
    devtools: <T>(id: string, data?: T, filter?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.devtools, filter);
    },
    pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => {
      this.sendMessage(id, data, RuntimeContext.pageScript, filter);
    },
    popup: <T>(id: string, data?: T) => {
      this.sendMessage(id, data, RuntimeContext.popup);
    },
  };

  constructor() {
    this.on(GET_FRAME_LIST_MESSAGE_ID, data => {
      this.frameList$.next(data as FrameList);
    });
  }

  /**
   * Register a listener to messages with id you specified
   * @param id message id
   * @param cb message listener
   */
  protected on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void) {
    portHub.findPort(RuntimeContext.background, {}, ports => {
      ports.forEach(port => {
        portHub.getSubject(port, id)?.subscribe(m => {
          if (m.id === id) {
            cb(m.data, m.sender, m.timestamp);
          }
        });
      });
    });
  }

  private sendMessage<T>(id: string, data: T, context: RuntimeContext, filters?: MessageFilters) {
    const message: Message<T> = {
      from: RuntimeContext.background,
      to: context,
      data,
      id,
      timestamp: Date.now(),
      filters,
    };
    portHub.findPort(context, filters ?? {}, ports => {
      ports.forEach(port => {
        portHub.getSubject(port, id)?.next(message);
      });
    });
  }
}
