import { reactive, effect } from '@vue/reactivity'

const obj = reactive({ name: 'zs' })
effect(() => {
  ;(<HTMLElement>document.querySelector('#app')).innerText = obj.name
})
