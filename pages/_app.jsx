/**
 * Copyright (c) 2022, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';

import '../styles/styles.css';

// This default export is required in a new `pages/_app.js` file.
export default function MyApp({ Component, pageProps }) {
  return (
    <div>
      <Head>
        <meta name="BUILD_TAG" content={`${process.env.NEXT_PUBLIC_BUILD_TAG}`} />
        <meta name="SDK_VERSION" content={`${process.env.NEXT_PUBLIC_SDK_VERSION}`} />
      </Head>
      <Component {...pageProps} />
    </div>
  );
}

/*
 * Define the type of data used in this component.
 */
MyApp.propTypes = {
  Component: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
  pageProps: PropTypes.shape({}).isRequired,
};
