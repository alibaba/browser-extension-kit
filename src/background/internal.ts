import { Log } from '../util/log';
import { ReplaySubject, Subscription } from 'rxjs';
import { RuntimeContext, Message, Port, PortName, MessageFilters } from '../types';
import { portHub } from '../util/portHub';
import { portToMessageFilters } from '../util/portToMessageFilters';
import { Background } from './background';

const backgroundInstanceHub = new Map<string, Background>();
export const messageLog = new Log('MESSAGE');

function handleMessage(sourcePort: Port) {
  return function (message: Message<unknown>) {
    portHub.findPort(message.to, message.filters ?? {}, ports => {
      ports.forEach(port => {
        portHub.getSubject(port, message.id)?.next({
          ...message,
          sender: portToMessageFilters(sourcePort),
        });
      });
    });
  };
}

function handlePostMessage(subject: ReplaySubject<Message<unknown>>, port: Port) {
  return subject.subscribe(m => {
    if (!m.id.includes('@@internal')) {
      messageLog.label(`${m.from} => ${m.to}::${m.id}`).info(m.data as string);
    }
    port.postMessage(m);
  });
}

function handleConnect(port: chrome.runtime.Port) {
  const portName = JSON.parse(port.name) as PortName;
  const subscription = new Subscription();

  const _port = port as Port;
  _port.groupId = portName.groupId;
  _port.context = portName.context;
  _port.devtoolsId = portName.devtoolsId;
  _port.className = portName.className;
  portHub.setPort(portName.context, _port);

  portHub.onAddNewSubject(_port, (id, subject) => {
    subscription.add(handlePostMessage(subject, _port));
  });
  portHub.getAllSubjcts(_port)?.forEach(subject => {
    subscription.add(handlePostMessage(subject, _port));
  });

  _port.onMessage.addListener(handleMessage(_port));

  _port.onDisconnect.addListener(() => {
    portHub.deletePort(portName.context, _port);
    subscription.unsubscribe();
  });
}

/**
 * Bootstraps any background part of your app.
 * @param scripts Sub classes inherited from `Background`
 */
export function bootstrap(scripts: Array<new () => Background>) {
  chrome.runtime.onConnect.addListener(handleConnect);
  chrome.runtime.onConnectExternal.addListener(handleConnect);

  scripts.forEach(C => {
    const instance = new C();
    const id = C.name;
    if (backgroundInstanceHub.has(id)) {
      throw new Error(`a ${instance.constructor.name} instance has already existed.`);
    }
    backgroundInstanceHub.set(id, instance);
  });
}
