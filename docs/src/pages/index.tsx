import React, { JSX } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import JustinLogo from '@site/static/img/justin-logo.svg';
import styles from './index.module.css';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="justin-core"
      description="The execution engine for JustIn interventions.">
      <header className={styles.heroBanner}>
        <div className="container">
          <JustinLogo className={styles.featureSvg} />
          <h1 className="hero__title">justin-core</h1>
          <p className="hero__subtitle">
            A lightweight execution engine for delivering adaptive interventions in real time.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link className="button button--primary" to="/using">
              Start Using justin-core
            </Link>
          </div>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="row">
          <div className="col col--4">
            <h3>Event-Driven Architecture</h3>
            <p>
              Events are the backbone of justin-core. Schedule or trigger them manually, then execute associated tasks and decision rules across participants.
            </p>
          </div>
          <div className="col col--4">
            <h3>Powerful Task & Rule Engine</h3>
            <p>
              Define reusable tasks and decision rules. Customize activation logic, execute complex steps, and route results for logging and follow-up.
            </p>
          </div>
          <div className="col col--4">
            <h3>Built for Research Apps</h3>
            <p>
              justin-core is designed for flexibility — run in cloud functions or server mode, integrate with MongoDB, and log structured results per participant.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
