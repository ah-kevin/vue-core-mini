import { type TrackOpTypes, TriggerOpTypes } from './constants'

export function track(target: object, type: TrackOpTypes, key: unknown): void {
  console.log('track: 收集依赖', target, type, key)
}

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
