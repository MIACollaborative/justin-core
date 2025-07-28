import React from 'react';
import Layout from '@theme/Layout';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Welcome to Justin" description="Documentation for the Justin JITAI framework.">
      <main style={{ padding: '2rem' }}>
        <h1>Welcome to Justin</h1>
        <p>
          Justin is a JITAI (Just-In-Time Adaptive Intervention) framework for delivering dynamic behavioral interventions.
        </p>
        <ul>
          <li><a href="/docs/intro">📘 Read the Docs</a></li>
          <li><a href="https://github.com/your-org/justin">💻 View on GitHub</a></li>
        </ul>
      </main>
    </Layout>
  );
}
