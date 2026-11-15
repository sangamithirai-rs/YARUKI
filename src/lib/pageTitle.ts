// One place decides the browser tab title, so the page name and the focus
// timer countdown never overwrite each other.
//   "Marks · YARUKI"            (normal)
//   "⏱ 12:30 · Marks · YARUKI"  (while a focus timer is running)

const BASE = 'YARUKI'

let page = ''
let prefix = ''

function apply() {
  const main = page ? `${page} · ${BASE}` : BASE

  document.title = prefix ? `${prefix} · ${main}` : main
}

export function setPageTitle(name: string) {
  page = name
  apply()
}

export function setTitlePrefix(text: string) {
  prefix = text
  apply()
}
