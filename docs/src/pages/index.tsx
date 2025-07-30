import React, { JSX } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import JustinLogo from '@site/static/img/justin-logo.svg';
import styles from './index.module.css';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="JustIn Docs"
      description="Just-in-time interventions, documented.">
      <header className={styles.heroBanner}>
        <div className="container">
          <JustinLogo className={styles.featureSvg} />
          <h1 className="hero__title">JustIn Docs</h1>
          <p className="hero__subtitle">Just-in-time interventions, documented.</p>
          <div style={{ marginTop: '1rem' }}>
            <Link className="button button--primary" to="/docs/about">
              Learn About JustIn
            </Link>
          </div>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="row">
          <div className="col col--4">
            <h3>Born from Frustration</h3>
            <p>
              JustIn began as a way to stop rebuilding the same mHealth apps over and over. We wanted reusable tools that research teams could adapt and extend.
            </p>
          </div>
          <div className="col col--4">
            <h3>Empowering Student Developers</h3>
            <p>
              We believe an undergrad CS student should be able to build a full-featured JITAI study app using JustIn — that’s our benchmark.
            </p>
          </div>
          <div className="col col--4">
            <h3>Open Source, Community-Driven</h3>
            <p>
              JustIn is freely available and extensible. We aim to serve the research community with a framework that grows through shared contributions.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
