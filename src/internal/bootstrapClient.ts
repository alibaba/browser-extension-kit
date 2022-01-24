import { Message, PortName, RuntimeContext } from '../types';
import { isFiltersMatch } from '../util/isFiltersMatch';
import { ClientScript } from './client-script';

const instanceHub = new Map<string, ClientScript>();

export function bootstrapClient(
  scripts: Array<{ class: new () => ClientScript; groupId?: string }>,
  context: RuntimeContext,
  extensionId?: string
) {
  scripts.forEach(script => {
    const { class: C, groupId } = script;
    const ctorName = C.name;

    if (instanceHub.has(ctorName)) {
      throw new Error(`An instance of ${ctorName} has already existed.`);
    }

    const portName: PortName = {
      context,
      groupId,
      className: ctorName,
    };
    let port: chrome.runtime.Port | undefined = extensionId
      ? chrome.runtime.connect(extensionId, {
          name: JSON.stringify(portName),
        })
      : chrome.runtime.connect({
          name: JSON.stringify(portName),
        });
    port.onDisconnect.addListener(() => {
      port = undefined;
    });

    port?.onMessage.addListener((message: Message<unknown>) => {
      instanceHub.forEach(instance => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        if (Array.isArray(instance['listeningMessageIds'])) {
          // eslint-disable-next-line @typescript-eslint/dot-notation
          instance['listeningMessageIds'].forEach(i => {
            if (i.id === message.id && isFiltersMatch(message.sender, i.filters)) {
              i.cb(message.data, message.sender, message.timestamp);
            }
          });
        }
      });
    });

    const instance = new C();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    instance['originalPort'] = port;
    // eslint-disable-next-line @typescript-eslint/dot-notation
    instance['pendingMessages'].forEach(m => {
      port?.postMessage(m);
    });
    // eslint-disable-next-line @typescript-eslint/dot-notation
    instance['pendingMessages'] = [];
    instanceHub.set(ctorName, instance);
  });
}
