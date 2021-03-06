English | [中文](./README.zh-cn.md)

# browser-extension-kit

- [browser-extension-kit](#browser-extension-kit)
  - [Background](#background)
  - [Getting-started](#getting-started)
    - [Install](#install)
    - [Instruction](#instruction)
    - [Demo](#demo)
  - [API](#api)
    - [`Background`](#background-1)
      - [`Background.bootstrap(scripts: Array<new () => Background>): void`](#backgroundbootstrapscripts-arraynew---background-void)
      - [`frameList$: Subject<FrameList>`](#framelist-subjectframelist)
      - [`port`](#port)
      - [`on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void):void`](#onid-string-cb-data-any-sender-messagefilters--undefined-timestamp-number--voidvoid)
    - [`ContentScript`](#contentscript)
      - [`ContentScript.bootstrap(scripts: Array<{ class: new () => ContentScript; groupId?: string }>): void`](#contentscriptbootstrapscripts-array-class-new---contentscript-groupid-string--void)
      - [`frameList$: Subject<FrameList>`](#framelist-subjectframelist-1)
      - [`port`](#port-1)
      - [`on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void, filters?: MessageFilters): void`](#onid-string-cb-data-any-sender-messagefilters--undefined-timestamp-number--void-filters-messagefilters-void)
      - [`injectPageScript(path: string): void`](#injectpagescriptpath-string-void)
    - [`PageScript`](#pagescript)
      - [`PageScript.bootstrap(extensionId: string, scripts: Array<{ class: new () => PageScript; groupId?: string }): void`](#pagescriptbootstrapextensionid-string-scripts-array-class-new---pagescript-groupid-string--void)
      - [`frameList$: Subject<FrameList>`](#framelist-subjectframelist-2)
      - [`port`](#port-2)
      - [`on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void, filters?: MessageFilters): void`](#onid-string-cb-data-any-sender-messagefilters--undefined-timestamp-number--void-filters-messagefilters-void-1)
    - [`Popup`](#popup)
      - [`useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`](#usemessaget--anyid-string-initialvalue-t-filters-messagefilters-t-messagefilters--undefined)
      - [`useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`](#useframecontext-runtimecontextcontentscript--runtimecontextpagescript--runtimecontextdevtools-messagefilters)
      - [`usePostMessage()`](#usepostmessage)
    - [`Devtools`](#devtools)
      - [`useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`](#usemessaget--anyid-string-initialvalue-t-filters-messagefilters-t-messagefilters--undefined-1)
      - [`useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`](#useframecontext-runtimecontextcontentscript--runtimecontextpagescript--runtimecontextdevtools-messagefilters-1)
      - [`usePostMessage()`](#usepostmessage-1)
    - [Decorators](#decorators)
      - [`observable(to: Array<'background' | 'contentScript' | 'devtools' | 'pageScript' | 'popup'>, id?: string)`](#observableto-arraybackground--contentscript--devtools--pagescript--popup-id-string)
      - [`subject(id: string)`](#subjectid-string)
  - [License](#license)

## Background

The difficulty in developing Chrome extensions is that there are multiple execution environments:

- background
- popup
- content-script
- page-script
- devtool

These environments are isolated from each other, and communication can only be achieved through `message`. The Chrome extension itself provides a `postMessage`-based messaging mechanism, but once you've actually used it for a while, you'll find that its API is not that useful. For example:

- Between different execution environments, it is necessary to distinguish between internal messages and external messages (such as page-script and background communication), and their APIs are different
- Order of connection establishment: The party that actively establishes the connection should be the party with the shorter life cycle, but the life cycle may be completely opposite in different scenarios, such as between devtools and page-script, which depends entirely on the opening and closing timing of devtools
- It is not possible to establish a direct connection between any two execution environments, such as page-script -> content-script -> background -> devtools
- There are various message delivery methods, which need to be used according to the actual situation, such as page-script -> content-script, that is, you can use Chrome's API (requires background transfer), or you can directly use `window.postMessage`

For these reasons, `browser-extension-kit` was born - a tool to help you develop Chrome extensions.

## Getting-started
### Install
```bash
npm i browser-extension-kit -S
// or
yarn add browser-extension-kit
```
### Instruction

Before starting development, you need to understand the basic design ideas and composition of Chrome extensions. This tool focuses on solving the biggest pain point in the extension development process - the message passing mechanism. For the rich API provided by Chrome itself, you still need to call it yourself.

In the official design idea of ​​the Chrome extension, a extension contains 5 mutually isolated execution environments:
- background
- content-script
- page-script
- devtools
- popup

In `browser-extension-kit`, according to these 5 execution environments, 3 base classes and 2 React hooks are abstracted:
- `Background`: the base class, the logic executed in the background needs to inherit this base class
- `ContentScript`: base class, all logic executed in content-script needs to inherit this base class
- `PageScript`: base class, all logic executed in page-script needs to inherit this base class
- `useMessage`: hooks, used in the execution environment related to the two UI interfaces of devtools and popup
- `usePostMessage`: hooks, used in the execution environment related to the two UI interfaces of devtools and popup

The execution environment of the UI class is essentially a React component, and this tool does not impose too many restrictions. For the remaining three execution environments, the static method `bootstrap` on the corresponding base class needs to be called for initialization.

### Demo
Suppose we need to make a extension, this extension needs to poll the server to get some data, and display the data in the popup, and the parameters of the polling interface need to be input by the user in the popup.
First, we need to implement the logic in the background, any extension must have a background, and we handle transactions in the background. Typically, you should define all core business logic and state in the background.
```ts
// src/background/myBackground.ts
import { interval, from, Subject } from 'rxjs';
import axios from 'axios';
import { Background } from 'browser-extension-kit/background';
import { observable, subject } from 'browser-extension-kit';
import { withLatestFrom, shareReplay, switchMap } from 'rxjs/operators';

export default class MyBackground extends Background {
  // Use @subject('MyBackground::id') to specify to listen for messages with id MyBackground::id
  // and automatically convert the data of this message to the next value of idSubject
  @subject('MyBackground::id') private idSubject = new Subject<string>();

  // Use @observable.popup() to automatically subscribe to data$,
  // and pass the value sent each time to popup through a message,
  // the id of the message defaults to MyBackground::data$
  @observable.popup() private data$ = interval(3000).pipe(
    withLatestFrom(this.idSubject),
    switchMap(([_, id]) => from(axios.get('/api/data', { params: { id }}))),
  ).pipe(
    shareReplay(1)
  );
}
```
```ts
// src/background/index.ts
import { Background } from 'browser-extension-kit/background';
import MyBackground from './MyBackground.ts';

// Use bootstrap to initialize
Background.bootstrap(MyBackground);
```
```ts
// src/popup/App.tsx
import React, { ChangeEvent, useCallback } from 'react';
import { useMessage, usePostMessage } from 'browser-extension-kit/popup';

const App = () => {
  const port = usePostMessage();
  // Accept message with id MyBackground::data$ and specify default value
  const data = useMessage<string>('MyBackground::data$', '');

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    // Send a message with id MyBackground::id to background
    port.background('MyBackground::id', e.target.value);
  }, [port]);

  return (
    <div>
      current data: {data}
      input id param: <input onChange={handleChange} />
    </div>
  );
};

export default App;
```
Note that in the example here, the background uses rxjs to manage data, you can also not use rxjs, the framework also provides a lower-level API for you to call, see the API documentation for details. ​

## API
### `Background`
#### `Background.bootstrap(scripts: Array<new () => Background>): void`

Initialize background related functions

#### `frameList$: Subject<FrameList>`

An rxjs Subject, the value of which is all frames currently connected

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

Send a message to the corresponding context, where,

```ts
interface MessageFilters {
  groupId?: string | number; // 用户自定义的 ID
  tabId?: number;
  windowId?: number;
  origin?: string;
  url?: string;
  frameId?: number;
  devtoolsId?: string;
  className?: string;
}
```

#### `on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void):void`

Listen for messages. Among them, `sender` in `cb` represents the information of the sender of the message.

### `ContentScript`

#### `ContentScript.bootstrap(scripts: Array<{ class: new () => ContentScript; groupId?: string }>): void`

Initialize contentScript related functions

#### `frameList$: Subject<FrameList>`

An rxjs Subject, the value of which is all frames currently connected

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

Send a message to the corresponding context, where,

```ts
interface MessageFilters {
  groupId?: string | number; // 用户自定义的 ID
  tabId?: number;
  windowId?: number;
  origin?: string;
  url?: string;
  frameId?: number;
  devtoolsId?: string;
  className?: string;
}
```

#### `on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void, filters?: MessageFilters): void`

Listen for messages, where `sender` in `cb` represents the information of the sender of the message, and `filters` can specify only certain messages by filtering

#### `injectPageScript(path: string): void`

inject script into page

### `PageScript`

#### `PageScript.bootstrap(extensionId: string, scripts: Array<{ class: new () => PageScript; groupId?: string }): void`

Initialize pageScript related functions

#### `frameList$: Subject<FrameList>`

An rxjs Subject, the value of which is all frames currently connected

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

Send a message to the corresponding context, where,

```ts
interface MessageFilters {
  groupId?: string | number; // 用户自定义的 ID
  tabId?: number;
  windowId?: number;
  origin?: string;
  url?: string;
  frameId?: number;
  devtoolsId?: string;
  className?: string;
}
```

#### `on(id: string, cb: (data: any, sender: MessageFilters | undefined, timestamp: number) => void, filters?: MessageFilters): void`

Listen for messages, where `sender` in `cb` represents the information of the sender of the message, and `filters` can specify only certain messages by filtering

### `Popup`

#### `useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`

listen for messages

#### `useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`

All frames currently connected

#### `usePostMessage()`

The returned data is consistent with `Background.port`

### `Devtools`

#### `useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`

listen for messages

#### `useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`

All frames currently connected

#### `usePostMessage()`

The returned data is consistent with `Background.port`


### Decorators

Available in subclasses of `Background` `ContentScript` `PageScript`

#### `observable(to: Array<'background' | 'contentScript' | 'devtools' | 'pageScript' | 'popup'>, id?: string)`

Automatically wrap the corresponding property. The property must be an `rxjs Observable`. When the value changes, it will automatically send a message to the context specified by `to`. The message `id` can be customized

It corresponds to the following simple method:

- `observable.background`
- `observable.contentScript`
- `observable.devtools`
- `observable.pageScript`
- `observable.popup`

#### `subject(id: string)`

Automatically listen for messages, the decorated property must be an `rxjs Subject`

## License
MIT