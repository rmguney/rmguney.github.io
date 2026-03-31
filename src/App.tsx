import React, { useState, useEffect, lazy, Suspense } from "react";
import { BalloonProvider } from './context/BalloonContext';
import Header from "./components/Header";
import Hero from "./components/Hero";
import Loading from "./components/Loading";
import Divider from "./components/Divider";
import Guide from "./components/Guide";
import MobileDivider from "./components/MobileDivider";
import { loadProgress } from './utils/loadProgress';
import { fetchReposData } from './utils/prefetchRepos';

const Scene = lazy(() => import("./components/Scene"));
const Projects = lazy(() => import("./components/Projects"));

export default function App(): React.ReactElement {
    const [sceneLoaded, setSceneLoaded] = useState<boolean>(false);
    const [reposLoaded, setReposLoaded] = useState<boolean>(false);
    const [revealed, setRevealed] = useState<boolean>(false);

    useEffect(() => {
        let active = true;
        const done = (): void => {
            if (!active) return;
            loadProgress.setPhase('repos', 1);
            setReposLoaded(true);
        };
        fetchReposData().then(done, done);
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!sceneLoaded || !reposLoaded) return;
        const timer = setTimeout(() => setRevealed(true), 140);
        return () => clearTimeout(timer);
    }, [sceneLoaded, reposLoaded]);

    useEffect(() => {
        if (revealed) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [revealed]);

    return (
        <BalloonProvider>
            <main>
                <section className="w-full h-screen relative" style={{ background: "linear-gradient(to bottom right, #fff 40%, #fff 75%)" }}>
                    <Header />
                    {revealed && <Guide />}
                    <Suspense fallback={null}>
                        <Scene setModelLoaded={setSceneLoaded} className="w-full h-full" />
                    </Suspense>
                    {revealed && <Hero />}
                    <MobileDivider />
                    <Divider />
                    <div className={revealed ? undefined : 'invisible'} aria-hidden={!revealed}>
                        <Suspense fallback={<div className="min-h-screen" />}>
                            <Projects />
                        </Suspense>
                    </div>
                </section>
                {!revealed && <Loading />}
            </main>
        </BalloonProvider>
    );
}

