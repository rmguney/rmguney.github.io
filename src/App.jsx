import { useState, lazy, Suspense } from "react"
import { BalloonProvider } from './context/BalloonContext'
import Header from "./components/Header"
import Hero from "./components/Hero"
import Loading from "./components/Loading"
import Scene from "./components/Scene"
import Divider from "./components/Divider"
import Guide from "./components/Guide"
import MobileDivider from "./components/MobileDivider"

// Lazy load Display component - it's below the fold
const Display = lazy(() => import("./components/Display"))

export default function App() {
  const [modelLoaded, setModelLoaded] = useState(false)
  
  return (
    <BalloonProvider>
      <main>
        <section className="w-full h-screen relative" style={{background: "linear-gradient(to bottom right, #fff 40%, #fff 75%)"}}>
          <Header />
          {modelLoaded && <Guide />}
          <Scene setModelLoaded={setModelLoaded} className="w-full h-full"/>
          {!modelLoaded ? <Loading /> : <Hero />}
          <MobileDivider />
          <Divider />
          <Suspense fallback={<div className="min-h-screen" />}>
            <Display />
          </Suspense>
        </section>
      </main>
    </BalloonProvider>
  )
}
