'use client'

import { useEffect } from 'react'

export default function RemoveExtensionAttributes() {
  useEffect(() => {
    try {
      const attrs = Array.from(document.body.attributes).map(a => a.name)
      attrs.forEach(name => {
        if (name.startsWith('data-gr') || name.startsWith('data-new-gr')) {
          document.body.removeAttribute(name)
        }
      })
    } catch (e) {
      // ignore
    }
  }, [])

  return null
}
