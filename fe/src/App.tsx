import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <section id="center">
      <h1>pyhr</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
      </p>
      <button
        className="counter"
        onClick={() => setCount((count) => count + 1)}
      >
        Count is {count}
      </button>
    </section>
  )
}

export default App
