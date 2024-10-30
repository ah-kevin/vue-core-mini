import { reactiveMap, type Target, toRaw } from './reactive'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { track, trigger } from './dep'
import { hasChanged, hasOwn, isArray, isIntegerKey } from '@vue/shared'

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _isShallow = false
  ) {}

  get(target: Target, key: string | symbol, receiver: any): any {
    if (key === ReactiveFlags.RAW) {
      if (
        receiver === reactiveMap.get(target) ||
        // 接收者不是reactive proxy，但具有相同的原型
        // 这意味着接收者是reactive proxy的用户代理
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target
      }
      return
    }
    const res = Reflect.get(target, key, receiver)
    track(target, TrackOpTypes.GET, key)
    return res
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }

  set(
    target: Record<string | symbol, unknown>,
    key: string | symbol,
    value: any,
    receiver: any
  ): boolean {
    let oldValue = target[key]
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)

    // 如果目标在原始原型链中向上，则不触发
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}

export const mutableHandlers: ProxyHandler<object> =
  new MutableReactiveHandler()
