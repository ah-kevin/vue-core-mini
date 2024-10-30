const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const isArray: typeof Array.isArray = Array.isArray
export const isString = (val: unknown): val is string => typeof val === 'string'

export const isIntegerKey = (key: unknown): boolean =>
  isString(key) && // 检查 key 是否是字符串
  key !== 'NaN' && // 检查 key 是否不是 'NaN'
  key[0] !== '-' && // 检查 key 是否不是负数
  '' + parseInt(key, 10) === key // 检查 key 转换为整数后是否与原字符串相同

//比较一个值是否已更改，考虑NaN。
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
