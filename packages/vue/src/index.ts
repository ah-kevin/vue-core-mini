import { reactive } from '@vue/reactivity'

const obj = reactive({ name: 'zs' })
console.log(obj.name)
obj.name = 'ls'
