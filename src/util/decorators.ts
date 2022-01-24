import PropertyStore from './propertyStore';
import { isObservable, Observable } from 'rxjs';

const propertyStore = new PropertyStore();

/**
 * Decorator wraps on a rxjs observable. It will automaticly subscribe this observable and any time this
 * observable emits a value, send this value as message to the target you specified by `id`.
 * @param to target context to which this message will be sent
 * @param id message id. Default is `ClassName::propertyName`
 * @returns void
 */
export function observable(
  to: Array<'background' | 'contentScript' | 'devtools' | 'pageScript' | 'popup'>,
  id?: string
) {
  return (target: any, propertyKey: string) => {
    Object.defineProperty(target, propertyKey, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      get: () => propertyStore.get(target, propertyKey),
      set(v: Observable<unknown>) {
        if (!isObservable(v)) {
          throw new Error(
            `Expect ${propertyKey} in ${target.constructor.name} is a rxjs Observable, but got ${typeof v}`
          );
        }

        propertyStore.set(target, propertyKey, v);

        to.forEach(t => {
          v.subscribe(data => {
            this.port[t](id ?? `${target.constructor.name}::${propertyKey}`, data);
          });
        });
      },
      enumerable: true,
      configurable: true,
    });
  };
}

observable.background = () => {
  return observable(['background']);
};
observable.contentScript = () => {
  return observable(['contentScript']);
};
observable.devtools = () => {
  return observable(['devtools']);
};
observable.pageScript = () => {
  return observable(['pageScript']);
};
observable.popup = () => {
  return observable(['popup']);
};

/**
 * Decorator to wraps on a rxjs Subject. It will automaticly subscribe messages with id you specified and
 * use this subject to emit a new value.
 * @param id message id
 * @returns void
 */
export function subject(id: string) {
  return (target: any, propertyKey: string) => {
    Object.defineProperty(target, propertyKey, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      get: () => propertyStore.get(target, propertyKey),
      set(v: any) {
        if (typeof v?.next !== 'function') {
          throw new Error(`Expect ${propertyKey} in ${target.constructor.name} is a rxjs Subject, but got ${typeof v}`);
        }
        propertyStore.set(target, propertyKey, v);

        this.on(id, (data: unknown) => {
          v.next(data);
        });
      },
      enumerable: true,
      configurable: true,
    });
  };
}
