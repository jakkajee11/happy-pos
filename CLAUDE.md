# Happy POS — Development Guidelines

## React Hooks Rules (CRITICAL)

All React hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, custom hooks) **must be called at the top level** of every component, **before any conditional return**.

### Do NOT

```tsx
export default function MyComponent() {
  const [foo, setFoo] = useState(false)

  if (someCondition) return null  // early return

  useEffect(() => { ... }, [])    // VIOLATION: hook after conditional return
  const [bar, setBar] = useState('')  // VIOLATION: hook after conditional return
}
```

### Do

```tsx
export default function MyComponent() {
  const [foo, setFoo] = useState(false)
  const [bar, setBar] = useState('')
  useEffect(() => { ... }, [])

  if (someCondition) return null  // early return AFTER all hooks

  return <div>...</div>
}
```

### Why

React tracks hooks by call order. If a conditional return causes a hook to be skipped on some renders, React detects a mismatch and crashes the entire page with "Rendered fewer hooks than expected."

### When writing or modifying components

1. Declare all hooks at the top of the component function
2. Place all conditional/early returns AFTER every hook call
3. Never put hooks inside `if`, loops, or nested functions
