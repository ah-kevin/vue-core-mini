import { type TrackOpTypes, TriggerOpTypes } from './constants'
import {
  activeSub,
  type DebuggerEventExtraInfo,
  EffectFlags,
  endBatch,
  startBatch,
  type Subscriber
} from './effect'
import { ComputedRefImpl } from './computed'
import { extend } from '@vue/shared'

/**
 * 每次发生被动变化时递增
 * 用于提供快速计算路径，避免在没有任何变化时重新计算。
 * 发生变化。
 */
export let globalVersion = 0

/**
 * 代表来源（Dep）和订阅者（Effect 或 Computed）之间的链接。
 * 数据源和订阅者之间是多对多的关系--数据源和订阅者之间的每一个链接都是由多个数据源组成的。
 * Dep 和子用户sub之间的每个链接都由一个 Link 实例表示。
 *
 * 链接也是两个双链表中的一个节点--一个是关联的
 * 子以跟踪其所有 dep，而关联 dep 则以跟踪其所有
 * 子节点。
 *
 * @internal
 */
export class Link {
  /**
   * - 在每次效果运行之前，所有之前的依赖链接dep links版本重置为-1
   * - 在运行期间，链接的版本在访问时与源依赖同步
   * - 运行后，版本为-1（从未使用过）的链接被清理
   * - up
   */
  version: number

  /**
   * 双链表的指针
   */
  nextDep?: Link
  prevDep?: Link
  nextSub?: Link
  prevSub?: Link
  prevActiveLink?: Link

  constructor(
    public sub: Subscriber,
    public dep: Dep
  ) {
    this.version = dep.version
    this.nextDep =
      this.prevDep =
      this.nextSub =
      this.prevSub =
      this.prevActiveLink =
        undefined
  }
}

/**
 * @internal
 */
export class Dep {
  version = 0
  /**
   * Link between this dep and the current active effect
   */
  activeLink?: Link = undefined

  /**
   * Doubly linked list representing the subscribing effects (tail)
   */
  subs?: Link = undefined
  /**
   * 代表订阅效果（head）的双链表
   * 仅用于 DEV，以正确顺序调用 onTrigger 钩子
   */
  subsHead?: Link

  /**
   * 对象属性的deps clean up
   */
  map?: KeyToDepMap = undefined

  key?: unknown = undefined
  /**
   * Subscriber counter
   */
  sc: number = 0

  constructor(public computed?: ComputedRefImpl | undefined) {
    if (__DEV__) {
      this.subsHead = undefined
    }
  }

  track(debugInfo?: DebuggerEventExtraInfo): Link | undefined {
    if (!activeSub) {
      return
    }
    let link = this.activeLink
    if (link === undefined || link.sub !== activeSub) {
      link = this.activeLink = new Link(activeSub, this)
      // 将链接添加到 activeEffect 作为 dep（作为尾部）
      if (!activeSub.deps) {
        activeSub.deps = activeSub.depsTail = link
      } else {
        link.prevDep = activeSub.depsTail
        activeSub.depsTail!.nextDep = link
        activeSub.depsTail = link
      }

      addSub(link)
    } else if (link.version === -1) {
      // 从上次运行中重复使用 - 已经是一个子程序，只是同步版本
      link.version = this.version
      if (link.nextDep) {
        console.log('nextDep:::', link.nextDep)
      }
    }
    if (__DEV__ && activeSub.onTrack) {
      activeSub.onTrack(extend({ effect: activeSub }, debugInfo))
    }
    console.log('track: 收集依赖', debugInfo)
    return link
  }

  trigger(debugInfo?: DebuggerEventExtraInfo): void {
    this.version++
    globalVersion++
    this.notify(debugInfo)
    console.log('trigger: 触发更新', debugInfo)
  }

  notify(debugInfo?: DebuggerEventExtraInfo): void {
    try {
      if (__DEV__) {
        // subs 是以相反的顺序通知和批处理的，
        // 然后在批处理结束时按原始顺序调用，
        // 但是 onTrigger 钩子应该在这里按原始顺序调用
        for (let head = this.subsHead; head; head = head.nextSub) {
          if (head.sub.onTrigger && !(head.sub.flags & EffectFlags.NOTIFIED)) {
            head.sub.onTrigger(
              extend(
                {
                  effect: head.sub
                },
                debugInfo
              )
            )
          }
        }
      }
      for (let link = this.subs; link; link = link.prevSub) {
        if (link.sub.notify()) {
          // 如果notify()返回`true`，这是一个computed。同时调用notify
          // 在其依赖项dep上 - 这里调用它而不是在计算值computed的notify内部
          // 以减少调用栈深度。
          ;(link.sub as ComputedRefImpl).dep.notify()
        }
      }
    } finally {
    }
  }
}

function addSub(link: Link) {
  // 增加订阅者计数
  link.dep.sc++
  if (link.sub.flags & EffectFlags.TRACKING) {
    const computed = link.dep.computed
    // 计算属性获取第一个订阅者
    // 启用跟踪并懒惰地订阅所有依赖项
    if (computed && !link.dep.subs) {
      computed.flags |= EffectFlags.TRACKING | EffectFlags.DIRTY
      for (let l = computed.deps; l; l = l.nextDep) {
        addSub(l)
      }
    }

    const currentTail = link.dep.subs
    if (currentTail !== link) {
      link.prevSub = currentTail
      if (currentTail) currentTail.nextSub = link
    }

    if (__DEV__ && link.dep.subsHead === undefined) {
      link.dep.subsHead = link
    }

    // 将当前链接设置为订阅者链表的尾部
    link.dep.subs = link
  }
}

type KeyToDepMap = Map<any, Dep>
export const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

/**
 * track 跟踪对reactive属性的访问。
 *
 * 这将检查当前正在运行的效果，并将其记录为dep
 *
 * 记录所有依赖于响应式属性的效果。

 * @param target - 包含响应式属性的对象。

 * @param type - 定义对响应式属性的访问类型。

 * @param key - 要跟踪的响应式属性的标识符。

 */
export function track(target: object, type: TrackOpTypes, key: unknown): void {
  if (activeSub) {
    // 尝试从 taregtMap 中，根据 target 获取 map
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      // 如果获取不到，则生成 新的 map 对象，并把该对象赋值给对应的 value
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      // 如果没有找到dep，则创建一个新的dep对象，并将其添加到depsMap中
      depsMap.set(key, (dep = new Dep()))
      dep.map = depsMap
      dep.key = key
    }
    if (__DEV__) {
      dep.track({ target, type, key })
    } else {
      dep.track()
    }
  }
}

/**
 * 查找与target（或特定属性）关联的所有deps，并

 * 触发存储在内的效果。

 * @param target - 反应式对象。

 * @param type - 定义需要触发效果的操作的类型。

 * @param key - 可以用来定位目标对象中的特定反应式属性。

 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
): void {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有依赖项
    globalVersion++
    return
  }
  const run = (dep: Dep | undefined) => {
    if (dep) {
      if (__DEV__) {
        dep.trigger({
          target,
          type,
          key,
          newValue,
          oldValue,
          oldTarget
        })
      } else {
        dep.trigger()
      }
    }
  }
  startBatch()
  depsMap.forEach((dep: Dep, key) => {
    run(depsMap.get(key))
  })
  endBatch()
  console.log(depsMap)
}
