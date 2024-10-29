/**
 * 用于处理 ref 类型的包装、解包（unwrap）等操作。它的核心目的是通过类型推导来确保
 * Vue 3 响应式系统能正确处理 Ref 类型及其派生类型（如 reactive 或 shallowReactive），
 * 并在开发时提供准确的类型提示。接下来，我将详细解释其中的每个部分。
 */
// unique symbol 使得每个 symbol 都是唯一的，不会与其他 symbol 冲突。
declare const RefSymbol: unique symbol
export declare const RawSymbol: unique symbol

/**
 * Ref<T, S> 是 ref 的类型定义，ref 是 Vue 3 中用于创建响应式数据的一种方式。
 * T 是 ref 持有的值的类型（即 value 的类型），S 是设置值的类型。一般情况下，T 和 S 是相同的，但可以不同。
 * value 是 ref 的核心属性，get 访问器用于获取值，set 访问器用于设置值。
 * [RefSymbol]: true 是一个私有的 symbol 属性，用于标识该对象是 Ref，并且不会出现在 IDE 自动补全中。
 * 它主要是为了在类型系统中起区分作用，不影响实际逻辑。
 */
export interface Ref<T = any, S = T> {
  get value(): T

  set value(_: S)

  /**
   * 类型区分符仅用。

   * 我们需要它在公共 d.ts 中，但不想它在 IDE 的自动完成中显示，所以使用私有 Symbol 代替。
   */
  [RefSymbol]: true
}

/**
 * 用于标记对象是浅层响应式的。在 Vue 3 中，浅层响应式（shallowReactive）
 * 只会对对象的第一层进行响应式处理，内部嵌套对象不会是响应式的。这个 symbol 用于区分浅层和深层响应式。
 */
export declare const ShallowReactiveMarker: unique symbol

/**
 * RefUnwrapBailTypes 是一个空的接口，允许其他包（如 @vue/runtime-dom）扩展。它定义了一些特定的类型，
 * 当 Vue 的 ref 解包时，如果遇到这些类型，会跳过解包过程。
 * 这为其他库（比如运行时 DOM 库）提供了一种机制，声明某些特殊的类型（如 Node、Window），
 * 这些类型在解包时会直接返回原始类型，不会被 Vue 的响应式系统处理
 * \@vue/runtime-dom 可以在其 d.ts 中这样声明：
 * ``` ts
 * declare module '@vue/reactivity' {
 *   export interface RefUnwrapBailTypes {
 *     runtimeDOMBailTypes: Node | Window
 *   }
 * }
 * ```
 */
export interface RefUnwrapBailTypes {}

/**
 * 是用于浅层解包 ref 的类型工具，它只解包对象的第一层。
 * 例如，如果 T 是 { foo: Ref<number> }，那么 ShallowUnwrapRef<T> 将是 { foo: number }。
 * 它使用了 TypeScript 的索引签名 [K in keyof T]，表示对 T 的每个属性 K，应用 DistributeRef 类型，解包这个属性。
 */
export type ShallowUnwrapRef<T> = {
  [K in keyof T]: DistributeRef<T[K]>
}

/**
 * DistributeRef 是一个类型分发工具，用于判断 T 是否是 Ref 类型。
 * T extends Ref<infer V, unknown>：这表示如果 T 是 Ref 类型，则提取 Ref 内部的值类型 V。
 * 如果 T 是 Ref 类型，就返回 V，否则返回 T 本身。
 */
type DistributeRef<T> = T extends Ref<infer V, unknown> ? V : T

/**
 * Primitive：定义了所有的原始类型，包含 string、number、boolean 等。
 * Builtin：在 Primitive 基础上，还包含了 Function、Date、Error、RegExp 等 JavaScript 内建对象类型。
 */
type Primitive = string | number | boolean | bigint | symbol | undefined | null
export type Builtin = Primitive | Function | Date | Error | RegExp

/**
 * UnwrapRef 是解包 Vue Ref 的类型工具，用于解开 ref 类型的包装并返回原始的非响应式类型。
 * T extends Ref<infer V, unknown>：如果 T 是 Ref，则提取 V，然后递归地调用 UnwrapRefSimple<V> 对其进行解包。
 * 如果 T 不是 Ref，则直接调用 UnwrapRefSimple<T> 进行解包。
 */
export type UnwrapRef<T> =
  T extends Ref<infer V, unknown> ? UnwrapRefSimple<V> : UnwrapRefSimple<T>

/**
 * T extends Builtin | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | { [RawSymbol]?: true }：
 * 如果 T 是内置类型（Builtin）、Ref、特殊类型（RefUnwrapBailTypes），或是被标记为原始对象（RawSymbol），那么返回 T 本身。
 *
 * T extends Map<infer K, infer V>：如果 T 是 Map 类型，则递归解包其值 V，
 * 并处理 Map 的其余部分（使用 Omit 来排除 Map 自身的属性）。
 *
 * T extends WeakMap<infer K, infer V>：同理，处理 WeakMap，递归解包 V。
 *
 * T extends Set<infer V> 和 T extends WeakSet<infer V>：处理 Set 和 WeakSet 类型，递归解包其值 V。
 * T extends ReadonlyArray<any>：如果 T 是只读数组，则解包数组中的每个元素。
 * T extends object & { [ShallowReactiveMarker]?: never }：如果 T 是一个普通对象，
 * 并且没有浅层响应式标记，则递归解包其属性。
 *
 * 否则，直接返回 T。
 */
export type UnwrapRefSimple<T> = T extends
  | Builtin
  | Ref
  | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
  | { [RawSymbol]?: true }
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>>
    : T extends WeakMap<infer K, infer V>
      ? WeakMap<K, UnwrapRefSimple<V>> &
          UnwrapRef<Omit<T, keyof WeakMap<any, any>>>
      : T extends Set<infer V>
        ? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>>
        : T extends WeakSet<infer V>
          ? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>>
          : T extends ReadonlyArray<any>
            ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
            : T extends object & { [ShallowReactiveMarker]?: never }
              ? {
                  [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
                }
              : T
