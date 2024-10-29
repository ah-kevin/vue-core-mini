import { ReactiveFlags } from './constants'
import { mutableHandlers } from './baseHandlers'
import type { Ref, UnwrapRefSimple } from './ref'

export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

// only unwrap nested ref
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>

declare const ReactiveMarkerSymbol: unique symbol

export interface ReactiveMarker {
  [ReactiveMarkerSymbol]?: void
}

export type Reactive<T> = UnwrapNestedRefs<T> &
  (T extends readonly any[] ? ReactiveMarker : {})

export const reactiveMap: WeakMap<Target, any> = new WeakMap<Target, any>()

export function reactive<T extends object>(target: T): Reactive<T>
export function reactive(target: object) {
  return createReactiveObject(target, false, mutableHandlers, reactiveMap)
}

function createReactiveObject(
  target: object,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<any, any>
) {
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}
