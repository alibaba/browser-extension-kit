[English](./README.md) | 中文

# browser-extension-kit

- [browser-extension-kit](#browser-extension-kit)
  - [背景](#背景)
  - [快速开始](#快速开始)
    - [安装](#安装)
    - [说明](#说明)
    - [举例](#举例)
  - [API](#api)
    - [`Background`](#background)
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

## 背景

Chrome 插件开发的难点在于存在多个执行环境：

- background
- popup
- content-script
- page-script
- devtool

这些环境之间互相隔离，通信只能依靠 `message` 来实现。Chrome 插件本身提供了基于 `postMessage` 的消息传递机制，但是一旦实际使用过一段时间后，你会发现其 API 并没有那么好用。比如说：

- 不同执行环境之间，需要区分内部消息和外部消息（如 page-script 和 background 通信），他们的 API 存在差异
- 建立连接的顺序：主动建立连接的一方应该是生命周期较短的一方，但是生命周期在不同的场景下可能完全相反，例如 devtools 和 page-script 之间，完全取决于 devtools 的打开关闭时机
- 并不是任意 2 个执行环境之间都可以直接建立连接，例如 page-script -> content-script -> background -> devtools
- message 传递方式有多种，需要根据实际情况区分使用，例如 page-script -> content-script，即可以使用 chrome 的 API（需要 background 中转），也可以直接使用 `window.postMessage`

基于这些原因，诞生了 `browser-extension-kit` ——一个帮助你开发 Chrome 插件的工具。

## 快速开始
### 安装
```bash
npm i browser-extension-kit -S
// or
yarn add browser-extension-kit
```
### 说明

在开始开发前，你需要了解 chrome 插件的基本设计思想和组成。本工具专注解决插件开发过程中最大的痛点——消息传递机制，对于 chrome 本身提供的丰富的 API，你仍然需要自行调用。

在 chrome 插件的官方设计思路中，一个插件包含 5 种互相隔离的执行环境：
- background
- content-script
- page-script
- devtools
- popup

在 `browser-extension-kit` 中，根据这 5 种执行环境，抽象出了 3 个基类和 2 个 React hooks：
- `Background`：基类，在 background 中执行的逻辑都需要继承这个基类
- `ContentScript`：基类，在 content-script 中执行的逻辑都需要继承这个基类
- `PageScript`：基类，在 page-script 中执行的逻辑都需要继承这个基类
- `useMessage`: hooks，用在 devtools 和 popup 这 2 个 UI 界面相关的执行环境中
- `usePostMessage`: hooks，用在 devtools 和 popup 这 2 个 UI 界面相关的执行环境中

对于 UI 类的执行环境，本质上是一个 React 组件，本工具不做过多限制。对于其余 3 个执行环境，都需要调用对应基类上的静态方法 `bootstrap` 来进行初始化。

### 举例
假设我们需要做一个插件，这个插件需要轮询服务器获取某项数据，并且在 popup 中展示该数据，而轮询接口的参数需要在 popup 中由用户输入。
首先，我们需要实现 background 中的逻辑，任何一个插件都必须有一个 background，我们在 background 中处理事务。通常情况下，你应该把所有核心业务逻辑和状态定义在 background 中。
```ts
// src/background/myBackground.ts
import { interval, from, Subject } from 'rxjs';
import axios from 'axios';
import { Background } from 'browser-extension-kit/background';
import { observable, subject } from 'browser-extension-kit';
import { withLatestFrom, shareReplay, switchMap } from 'rxjs/operators';

export default class MyBackground extends Background {
  // 使用 @subject('MyBackground::id') 来指定监听 id 为 MyBackground::id 的消息
  // 并自动将这个消息的 data 转化为 idSubject 的下一个值
  @subject('MyBackground::id') private idSubject = new Subject<string>();

  // 使用 @observable.popup() 来自动订阅 data$，并把每次发出的值通过消息传递给 popup
  // 消息的 id 默认为 MyBackground::data$
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

// 使用 bootstrap 来初始化
Background.bootstrap(MyBackground);
```
```ts
// src/popup/App.tsx
import React, { ChangeEvent, useCallback } from 'react';
import { useMessage, usePostMessage } from 'browser-extension-kit/popup';

const App = () => {
  const port = usePostMessage();
  const data = useMessage<string>('MyBackground::data$', ''); // 接受 id 为 MyBackground::data$ 的消息并指定默认值

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    port.background('MyBackground::id', e.target.value) // 向 background 发送 id 为 MyBackground::id 的消息
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
注意在这里的例子中，background 使用了 rxjs 来管理数据，你也可以不使用 rxjs，框架也提供了更底层的 API 供你调用，详见 API 文档。​

## API
### `Background`
#### `Background.bootstrap(scripts: Array<new () => Background>): void`

初始化 background 相关功能

#### `frameList$: Subject<FrameList>`

一个 rxjs Subject，值为当前建立连接的所有 frame

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

向对应的 context 发送消息，其中，

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

监听消息。其中，`cb` 中的 `sender` 代表消息的发送方的信息。

### `ContentScript`

#### `ContentScript.bootstrap(scripts: Array<{ class: new () => ContentScript; groupId?: string }>): void`

初始化 contentScript 相关功能

#### `frameList$: Subject<FrameList>`

一个 rxjs Subject，值为当前建立连接的所有 frame

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

向对应的 context 发送消息，其中，

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

监听消息，其中，`cb` 中的 `sender` 代表消息的发送方的信息，`filters` 可以通过过滤指定只接受某些特定的消息

#### `injectPageScript(path: string): void`

向页面注入 script

### `PageScript`

#### `PageScript.bootstrap(extensionId: string, scripts: Array<{ class: new () => PageScript; groupId?: string }): void`

初始化 pageScript 相关功能

#### `frameList$: Subject<FrameList>`

一个 rxjs Subject，值为当前建立连接的所有 frame

#### `port`

- `port.background: <T>(id: string, data?: T) => void`
- `port.contentScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.devtools: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.pageScript: <T>(id: string, data?: T, filter?: MessageFilters) => void`
- `port.popup: <T>(id: string, data?: T, filter?: MessageFilters) => void`

向对应的 context 发送消息，其中，

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

监听消息，其中，`cb` 中的 `sender` 代表消息的发送方的信息，`filters` 可以通过过滤指定只接受某些特定的消息

### `Popup`

#### `useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`

监听消息

#### `useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`

当前建立连接的所有 frame

#### `usePostMessage()`

返回数据和 `Background.port` 保持一致

### `Devtools`

#### `useMessage<T = any>(id: string, initialValue?: T, filters?: MessageFilters): [T, MessageFilters | undefined]`

监听消息

#### `useFrame(context: RuntimeContext.contentScript | RuntimeContext.pageScript | RuntimeContext.devtools): [MessageFilters[]]`

当前建立连接的所有 frame

#### `usePostMessage()`

返回数据和 `Background.port` 保持一致


### Decorators

可用在 `Background` `ContentScript` `PageScript` 的子类中

#### `observable(to: Array<'background' | 'contentScript' | 'devtools' | 'pageScript' | 'popup'>, id?: string)`

自动包装对应的属性，该属性必须是一个 `rxjs Observable`，当值变化后，自动向 `to` 指定的 context 发送消息，可自定义消息 `id`

对应如下简便方法：

- `observable.background`
- `observable.contentScript`
- `observable.devtools`
- `observable.pageScript`
- `observable.popup`

#### `subject(id: string)`

自动监听消息，被装饰的属性必须是一个 `rxjs Subject`



## License
MIT