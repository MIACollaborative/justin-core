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
          <h1 className="hero__title">JustIn Core</h1>
          <p className="hero__subtitle">
            The foundation of the <a href="https://miacollaborative.github.io/justin-docs/">JustIn Framework</a>, 
            including the core data models and event-driven execution of intervention logic.
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
              Define reusable tasks and decision rules. Customize activation logic, execute complex decisions and actions, and route log results for monitoring and analysis.
            </p>
          </div>
          <div className="col col--4">
            <h3>Built for Research Apps</h3>
            <p>
              Designed by researchers for researchers, JustIn is flexible enough to suppport your innovative ideas while 
              saving you the headaches of rebuilding the tedious stuff over and over again.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
