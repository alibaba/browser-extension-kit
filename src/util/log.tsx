import dayjs from 'dayjs';
import serialize from 'serialize-javascript';
import { serializeError } from 'serialize-error';

export interface LogMessage {
  time: string;
  level: 'info' | 'error';
  labels: string[];
  msg: any[];
}

export class Log {
  /**
   * @internal
   *
   * @static
   * @type {LogMessage[]}
   * @memberof Log
   */
  static buffer: LogMessage[] = [];

  private maxLogSize = 100;

  private afterError = (logs: LogMessage[]) => {};

  private fixedLabels: string[] = [];

  private labels: string[] = [];

  private colorList = [this.colorize('#9254de'), this.colorize('#36cfc9'), this.colorize('#36cf5c')];

  /**
   * Initialize a Log instance with some labels to append before messages
   * @param fixedLabels labels to append before messages
   */
  constructor(...fixedLabels: string[]) {
    this.fixedLabels = fixedLabels;
  }

  private push(msg: LogMessage) {
    if (Log.buffer.length < this.maxLogSize) {
      Log.buffer.push(msg);
    } else {
      Log.buffer.shift();
      this.push(msg);
    }
  }

  private flush() {
    const old = Log.buffer;
    Log.buffer = [];
    return old;
  }

  private colorize(bg: string) {
    return `background: ${bg}; color: #fff; line-height: 20px;`;
  }

  /**
   * Set inner buffer size which will store incoming messages.
   * @param size : number;
   */
  setMaxLogSize(size: number) {
    this.maxLogSize = size;
  }

  /**
   * Set an action which will be invoked on you push an error message
   * @param fn action
   */
  setAfterErrorAction(fn: (logs: LogMessage[]) => void) {
    this.afterError = fn;
  }

  /**
   * Additional labels to print after labels you set in constructor. This labels will be used only once.
   * @example this.label('myLabel').info(myMessage)
   * @param labels additional labels to print after labels you set in constructor
   * @returns this
   */
  label(...labels: string[]) {
    this.labels = labels;
    return this;
  }

  /**
   * Log a message in 'info' level
   * @param msg any[]
   */
  info(...msg: any[]) {
    const time = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const labels = [...this.fixedLabels, ...this.labels];

    this.push({
      time,
      level: 'info',
      labels,
      msg,
    });

    console.log(
      `\n %c [${time}] %c [INFO] ${labels.map(l => `%c [${l}]`).join(' ')} `,
      this.colorize('#666'),
      this.colorize('#096dd9'),
      ...labels.map((i, index) => {
        return this.colorList[index % this.colorList.length];
      }),
      ...msg,
      '\n'
    );

    this.labels = [];
  }

  /**
   * Log a message in error level. This will trigger action callback you set in `setAfterErrorAction` method.
   * @param msg any[]
   */
  error(...msg: any[]) {
    const time = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const labels = [...this.fixedLabels, ...this.labels];

    try {
      this.push({
        time,
        level: 'error',
        labels,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        msg: msg.map(m => (m instanceof Error ? serializeError(m) : JSON.parse(serialize(m)))),
      });
    } catch (err) {
      console.error(err);
    }

    console.error(
      `\n %c [${time}] %c [ERROR] ${labels.map(l => `%c [${l}]`).join(' ')} `,
      this.colorize('#666'),
      this.colorize('#f5222d'),
      ...labels.map((i, index) => {
        return this.colorList[index % this.colorList.length];
      }),
      ...msg,
      '\n'
    );

    this.labels = [];

    const logs = this.flush();
    this.afterError(logs);
  }
}
