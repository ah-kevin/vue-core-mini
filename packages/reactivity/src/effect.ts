import type { TrackOpTypes, TriggerOpTypes } from './constants'
import { type Link } from './dep'
import { extend } from '@vue/shared'

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

/**
 * 定义了 ReactiveEffect 的标志位
 */
export enum EffectFlags {
  // ACTIVE：表示 effect 是活跃的
  ACTIVE = 1 << 0,
  // RUNNING：表示 effect 正在运行
  RUNNING = 1 << 1,
  // TRACKING：表示 effect 正在追踪
  TRACKING = 1 << 2,
  // NOTIFIED：表示 effect 已经通知
  NOTIFIED = 1 << 3,
  // DIRTY：表示 effect 是脏的
  DIRTY = 1 << 4,
  // ALLOW_RECURSE：表示 effect 允许递归
  ALLOW_RECURSE = 1 << 5,
  // PAUSED：表示 effect 是暂停的
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
  notify(): void {
    if (
      this.flags & EffectFlags.RUNNING &&
      !(this.flags & EffectFlags.ALLOW_RECURSE)
    ) {
      console.warn('called notify while running')
      return
    }
    if (!(this.flags & EffectFlags.NOTIFIED)) {
      batch(this)
    }
  }

  run(): T {
    activeSub = this
    return this.fn()
  }

  stop(): void {}

  trigger(): void {
    this.run()
  }

  /**
   * @internal
   */
  runIfDirty(): void {}

  get dirty(): boolean {
    return false
  }
}

let batchDepth = 0
let batchedSub: Subscriber | undefined
let batchedComputed: Subscriber | undefined

/**
 * `|=` 是一个按位或赋值运算符。它将左操作数与右操作数进行按位或运算，并将结果赋值给左操作数。
 *
 * 例如：
 * ```typescript
 * let a = 5; // 二进制: 0101
 * let b = 3; // 二进制: 0011
 * a |= b;    // 结果: 0111 (即 7)
 * ```
 *
 * 在你的代码中，`sub.flags |= EffectFlags.TRACKING` 的作用是将 `sub.flags` 与
 * `EffectFlags.TRACKING` 进行按位或运算，并将结果赋值给 `sub.flags`。这通常用于设置特定位标志。
 */
export function batch(sub: Subscriber, isComputed = false): void {
  sub.flags |= EffectFlags.NOTIFIED
  if (isComputed) {
    sub.next = batchedComputed
    batchedComputed = sub
    return
  }
  sub.next = batchedSub
  batchedSub = sub
}

/**
 * @internal
 */
export function startBatch(): void {
  batchDepth++
}

/**
 * 当所有批次结束时运行批次effect
 */
export function endBatch(): void {
  let error: unknown
  while (batchedSub) {
    let e: Subscriber | undefined = batchedSub
    batchedSub = undefined
    while (e) {
      // 获取下一个节点
      const next: Subscriber | undefined = e.next
      // 断开当前节点的 next 引用，帮助 GC
      e.next = undefined
      // 清除 NOTIFIED 标志
      e.flags &= ~EffectFlags.NOTIFIED
      if (e.flags & EffectFlags.ACTIVE) {
        try {
          // ACTIVE flag is effect-only
          // 触发更新
          ;(e as ReactiveEffect).trigger()
        } catch (err) {
          if (!error) error = err
        }
      }
      // 移动到下一个节点
      e = next
    }
  }
  if (error) throw error
}

export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner<T> {
  // noinspection SuspiciousTypeOfGuard
  if ((fn as ReactiveEffectRunner).effect instanceof ReactiveEffect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }
  const e = new ReactiveEffect(fn)
  if (options) {
    extend(e, options)
  }
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
