import { type DebuggerEvent, EffectFlags, type Subscriber } from './effect'
import { Dep, type Link } from './dep'

export class ComputedRefImpl<T = any> implements Subscriber {
  /**
   * @internal
   */
  _value: any = undefined
  /**
   * @internal
   */
  readonly dep: Dep = new Dep(this)
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
  flags: EffectFlags = EffectFlags.DIRTY
  /**
   * @internal
   */
  next?: Subscriber = undefined

  notify(): true | void {
    return undefined
  }

  onTrack(event: DebuggerEvent): void {}

  onTrigger(event: DebuggerEvent): void {}
}
