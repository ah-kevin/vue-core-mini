import type { TrackOpTypes, TriggerOpTypes } from './constants'
import { type Link } from './dep'

export type EffectScheduler = (...args: any[]) => any
export type DebuggerEvent = { effect: Subscriber } & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface ReactiveEffectOptions extends DebuggerOptions {
  scheduler?: EffectScheduler
  allowRecurse?: boolean
  onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
  (): T

  effect: ReactiveEffect
}

export let activeSub: Subscriber | undefined

export enum EffectFlags {
  /**
   * ReactiveEffect only
   */
  ACTIVE = 1 << 0,
  RUNNING = 1 << 1,
  TRACKING = 1 << 2,
  NOTIFIED = 1 << 3,
  DIRTY = 1 << 4,
  ALLOW_RECURSE = 1 << 5,
  PAUSED = 1 << 6
}

/**
 * Subscriber 是一种跟踪（或订阅） deps 列表的类型。
 */
export interface Subscriber extends DebuggerOptions {
  /**
   * 代表 deps 的双链表的首部
   * @internal
   */
  deps?: Link
  /**
   * 同一列表的尾部
   * @internal
   */
  depsTail?: Link
  /**
   * @internal
   */
  flags: EffectFlags
  /**
   * @internal
   */
  next?: Subscriber

  /**
   * 返回 `true` 表示计算需要调用 notify
   * 也需要调用
   * @internal
   */
  notify(): true | void
}

export class ReactiveEffect<T = any>
  implements Subscriber, ReactiveEffectOptions
{
  /**
   * @internal
   */
  deps?: Link = undefined
  /**
   * @internal
   */
  depsTail?: Link = undefined
  /**
   * @internal
   */
  flags: EffectFlags = EffectFlags.ACTIVE | EffectFlags.TRACKING
  /**
   * @internal
   */
  next?: Subscriber = undefined
  /**
   * @internal
   */
  cleanup?: () => void = undefined

  scheduler?: EffectScheduler = undefined
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void

  constructor(public fn: () => T) {}

  pause(): void {}

  resume(): void {}

  /**
   * @internal
   */
  notify(): true | void {
    return undefined
  }

  run(): T {
    activeSub = this
    return this.fn()
  }

  stop(): void {}

  trigger(): void {}

  /**
   * @internal
   */
  runIfDirty(): void {}

  get dirty(): boolean {
    return false
  }
}

export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner<T> {
  const e = new ReactiveEffect(fn)
  try {
    e.run()
  } catch (error) {
    e.stop()
    console.error(error)
    throw error
  }
  const runner = e.run.bind(e) as ReactiveEffectRunner
  runner.effect = e
  return runner
}
