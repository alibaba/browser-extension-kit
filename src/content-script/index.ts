import { RuntimeContext } from '../types';
import { ClientScript } from '../internal/client-script';
import { bootstrapClient } from '../internal/bootstrapClient';

export abstract class ContentScript extends ClientScript {
  static bootstrap(scripts: Array<{ class: new () => ContentScript; groupId?: string }>) {
    bootstrapClient(scripts, RuntimeContext.contentScript);
  }

  constructor() {
    super(RuntimeContext.contentScript);
  }

  protected injectPageScript(path: string) {
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = path;
    (document.head || document.documentElement).appendChild(s);
  }
}
