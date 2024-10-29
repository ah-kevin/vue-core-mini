import type { Target } from './reactive'

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _isShallow = false
  ) {}

  get(target: Target, p: string | symbol, receiver: any): any {}
}

class MutableReactiveHandler extends BaseReactiveHandler {
  set(
    target: Record<string | symbol, unknown>,
    key: string | symbol,
    value: any,
    receiver: any
  ): boolean {
    return true
  }
}

export const mutableHandlers: ProxyHandler<object> =
  new MutableReactiveHandler()
