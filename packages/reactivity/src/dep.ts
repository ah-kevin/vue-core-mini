import { type TrackOpTypes, TriggerOpTypes } from './constants'
export class Link {}
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
  console.log('track: 收集依赖', target, type, key)
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
  console.log(
    'trigger: 触发更新',
    target,
    type,
    key,
    newValue,
    oldValue,
    oldTarget
  )
}
