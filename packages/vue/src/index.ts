import { reactive, effect } from '@vue/reactivity'

const obj = reactive({ name: '孙悟空' })
effect(() => {
  ;(<HTMLElement>document.querySelector('#app')).innerText = obj.name
})

setTimeout(() => {
  obj.name = '猪八戒'
}, 2000)
