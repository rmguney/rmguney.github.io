"use client"

import { useState } from "react"
import Head from "next/head"
import { BalloonProvider } from '../context/BalloonContext'
import Header from "../components/Header"
import Hero from "../components/Hero"
import Scene from "../components/Scene"
import Display from "../components/Display"
import Divider from "../components/Divider"
import Guide from "../components/Guide"
import MobileDivider from "../components/MobileDivider"

export default function HomePage() {
  const [modelLoaded, setModelLoaded] = useState(false)
  
  return (
    <BalloonProvider>
      <Head>
        <title>/rmguney</title>
        <meta property="og:title" content="/rmguney" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rmguney.github.io" />
        <meta property="og:image" content="https://rmguney.github.io/favicon.ico" />
      </Head>
      <main>
        <section className="w-full h-screen relative" style={{background: "linear-gradient(to bottom right, #fff 40%, #fff 75%)"}}>
          <Header modelLoaded={modelLoaded} />
          <Guide />
          <Scene setModelLoaded={setModelLoaded} className="w-full h-full"/>
          <Hero />
          <MobileDivider />
          <Divider />
          <Display />
        </section>
      </main>
    </BalloonProvider>
  )
}
