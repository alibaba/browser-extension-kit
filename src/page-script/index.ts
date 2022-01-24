import { RuntimeContext } from '../types';
import { ClientScript } from '../internal/client-script';
import { bootstrapClient } from '../internal/bootstrapClient';

export abstract class PageScript extends ClientScript {
  static bootstrap(extensionId: string, scripts: Array<{ class: new () => PageScript; groupId?: string }>) {
    bootstrapClient(scripts, RuntimeContext.pageScript, extensionId);
  }

  constructor() {
    super(RuntimeContext.pageScript);
  }
}
