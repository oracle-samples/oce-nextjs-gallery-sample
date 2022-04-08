/**
 * Copyright (c) 2022, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
import React from 'react';
import Head from 'next/head';
import PropTypes from 'prop-types';
import Gallery from '../components/Gallery';
import { getHomePageData } from '../scripts/services';

/**
 * Component for the home page.
 */
export default function Index({ data }) {
  const { categories } = data;

  return (
    <>
      <Head>
        <title>Image Gallery</title>
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta name="description" content="Sample Gallery app created in NextJs that utilizes the content sdk library" />
        <link rel="shortcut icon" href="/favicon.png" />
      </Head>
      <div>
        <h1 className="heading">Image Gallery</h1>
        <div className="gallerycontainer">
          {/* Iterate through the categories and render the gallery for each */}
          {categories
            && categories.map((category) => (
              <Gallery
                key={category.id}
                category={category}
              />
            ))}
        </div>
      </div>
    </>
  );
}

/**
 * Called during build to generate this page.
 *
 * This is never called when the application is running,
 * i.e. its not called on the server when a request comes in or on the client side.
 */
export async function getStaticProps() {
  const data = await getHomePageData();
  return {
    props: { data },
  };
}

/*
 * Define the type of data used in this component.
 */
Index.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  }).isRequired,
};
