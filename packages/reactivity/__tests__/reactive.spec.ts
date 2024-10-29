import { describe, test, expect } from 'vitest'
import { reactive } from '../src/reactive'

describe('reactive/reactive', () => {
  test('Object', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
  })
})
