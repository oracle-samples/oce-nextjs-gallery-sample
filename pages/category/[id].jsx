/**
 * Copyright (c) 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import React from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import PropTypes, { number } from 'prop-types';
import { fetchAllTaxonomiesCategories, getImageGridPageData } from '../../scripts/services';
import getDeliveryClient from '../../scripts/server-config-utils';

// use "next-images" to add the ability to import images as objects
// we are using this so that when the application is accessed through a reverse
// proxy to add a base path the images are still loaded correctly
import backImage from '../../public/back.png';

/**
 * This component displays the assets belonging to a category in a grid view.
 * Upon clicking an image, it allows display of the images in a slideshow.
 *
 * @param categoryId the id of the category whose items are to be displayed
 * @param categoryName the name of the category whose items are to be displayed
 */
class ImageGridPage extends React.Component {
  /**
   * static method to handle back button being clicked
   * to go back to the main page
   */
  static handleBack(e) {
    e.preventDefault();
    window.history.back();
  }

  constructor(props) {
    super(props);
    this.state = {
      currentImage: -1, // the index of the image currently being rendered
    };
  }

  // executed client side only
  componentDidMount() {
    // add event listener for keydown for navigating through large view of images
    document.addEventListener(
      'keydown',
      (e) => this.handleKeypressFunction(e),
      false,
    );
  }

  /*
   * Called when the component unmounts.
   * Unregister the keydown event listener
   */
  componentWillUnmount() {
    document.removeEventListener(
      'keydown',
      (e) => this.handleKeypressFunction(e),
      false,
    );
  }

  /**
   * Handle click on the grid item. Sets the current image on the state.
   */
  handleClick(event) {
    const imageClicked = event.target.getAttribute('data-key');
    if (!imageClicked) {
      return; // check for null image. This may be null when you click on empty white space
    }
    const el = document.getElementsByTagName('body');
    el[0].classList.add('modal-open');
    this.setState({
      currentImage: parseInt(imageClicked, 10),
    });
  }

  /**
   * Handle Keypress events. If the left arrow or right arrow key is pressed,
   * adjust the slideshow accordingly. If esc is pressed, exit slideshow mode.
   */
  handleKeypressFunction(e) {
    const { currentImage } = this.state;
    if (currentImage === -1) {
      return;
    }

    if (e.keyCode === 37) {
      // left arrow
      this.handlePrevNextClick(e, false);
    } else if (e.keyCode === 39) {
      // right arrow
      this.handlePrevNextClick(e, true);
    } else if (e.keyCode === 27) {
      // esc key
      this.handleCloseClick(e);
    }
  }

  /**
   * Handle clicks on the prev/next buttons. If its on the first item
   * or last item, don't do anything on the prev or next respectively
   */
  handlePrevNextClick(e, increment) {
    const { currentImage } = this.state;
    const { data } = this.props;
    const { totalResults } = data;

    e.preventDefault();
    if (
      (currentImage === 0 && !increment)
      || (currentImage === totalResults - 1 && increment)
    ) {
      return;
    }

    this.setState({
      currentImage: increment ? currentImage + 1 : currentImage - 1,
    });
  }

  /**
   * Handle click on the close button of the slideshow.
   * Remove the modal-open class from the body so that scrollbars can
   * work again.
   */
  handleCloseClick(e) {
    e.preventDefault();
    const el = document.getElementsByTagName('body');
    el[0].classList.remove('modal-open');
    this.setState({
      currentImage: -1,
    });
  }

  /*
   * Render the component
   */
  render() {
    const { categoryName, data } = this.props;
    if (!data) {
      return <div>Loading...</div>;
    }
    const { currentImage } = this.state;
    const { items, totalResults } = data;

    // class names for the next/previous buttons
    const hidePrev = currentImage === 0;
    const hideNext = currentImage === totalResults - 1;
    const prevClassName = `prev${hidePrev ? ' hidden' : ''}`;
    const nextClassName = `next${hideNext ? ' hidden' : ''}`;

    // the HTML for rendering every item's small rendition URL
    const childElements = items.map((item, i) => {
      const { renditionUrls } = item;
      return (
        <div key={item.id} className="grid-item">
          {renditionUrls && (
            <picture>
              <source
                type="image/webp"
                srcSet={renditionUrls.srcset}
                sizes="(min-width: 480px) 200px, 150px"
              />
              <source
                srcSet={renditionUrls.jpgSrcset}
                sizes="(min-width: 480px) 200px, 150px"
              />
              <img
                src={renditionUrls.small}
                loading="lazy"
                data-key={i}
                alt="Small Preview"
                width={renditionUrls.width}
                height={renditionUrls.height}
              />
            </picture>
          )}
        </div>
      );
    });

    return (
      <>
        <Head>
          <title>{categoryName}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1.0" />
          <meta name="description" content="Sample Gallery app created in NextJs that utilizes the content sdk library" />
        </Head>
        <div>
          <div>
            <div
              className="back"
              onClick={ImageGridPage.handleBack}
              onKeyDown={ImageGridPage.handleBack}
              role="button"
              tabIndex="0"
            >
              <img src={backImage} alt="Navigate back to Home" />
              <span>Home</span>
            </div>

            <h1 className="heading">{categoryName}</h1>
            <h2 className="subheading">
              {totalResults}
              {' '}
              photos
            </h2>
          </div>

          {/* No items message */}
          {items.length === 0 && (
            <div className="message">There are no images in this category.</div>
          )}

          {/* Grid of images */}
          {items.length > 0 && (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              className="grid"
              onClick={(e) => this.handleClick(e)}
            >
              {childElements}
            </div>
          )}

          {/* Image preview overlaid ontop of grid of images */}
          {items.length > 0 && currentImage !== -1 && (
            <div className="page-container">
              <section className="slideshow-container">
                <div className="mySlides fade">
                  <div className="imgdiv">
                    <picture>
                      <source
                        type="image/webp"
                        srcSet={items[currentImage].renditionUrls.srcset}
                        sizes="90vh"
                      />
                      <source
                        srcSet={items[currentImage].renditionUrls.jpgSrcset}
                        sizes="90vh"
                      />
                      <img
                        src={items[currentImage].renditionUrls.large}
                        sizes="90vh"
                        loading="lazy"
                        alt="Large preview"
                        width={items[currentImage].renditionUrls.width}
                        height={items[currentImage].renditionUrls.height}
                      />
                    </picture>
                    <div className="numbertext">
                      {currentImage + 1}
                      {' '}
                      /
                      {totalResults}
                    </div>
                  </div>
                </div>
              </section>

              <div
                className={prevClassName}
                onClick={(e) => this.handlePrevNextClick(e, false)}
                onKeyDown={(e) => this.handlePrevNextClick(e, false)}
                role="button"
                tabIndex="0"
              >
                &#10094;
              </div>

              <div
                className={nextClassName}
                onClick={(e) => this.handlePrevNextClick(e, true)}
                onKeyDown={(e) => this.handlePrevNextClick(e, true)}
                role="button"
                tabIndex="0"
              >
                &#10095;
              </div>

              <div
                className="close"
                onClick={(e) => this.handleCloseClick(e, true)}
                onKeyDown={(e) => this.handleCloseClick(e, true)}
                role="button"
                tabIndex="0"
              >
                X
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}

export default withRouter(ImageGridPage);

/**
 * Called during build to generate this page.
 *
 * This is never called when the application is running,
 * i.e. its not called on the server when a request comes in or on the client side.
 */
export async function getStaticProps(context) {
  const { params } = context;

  const { id } = params;
  const arr = id.split('-');
  const categoryName = arr[1];
  const categoryId = arr[0];
  const data = await getImageGridPageData(categoryId);
  return {
    props: {
      data,
      categoryName,
    },
  };
}

/**
 * Called during build to generate all paths to this .
 * This is never called when the application is running,
 */
export async function getStaticPaths() {
  const deliveryClient = getDeliveryClient();
  const categories = await fetchAllTaxonomiesCategories(deliveryClient);
  return {
    paths: categories.map((category) => ({
      params: { id: `${category.id}-${category.name}` },
    })),
    fallback: true,
  };
}

/*
 * Define the type of data used in this component.
 */
ImageGridPage.propTypes = {
  data: PropTypes.shape({
    totalResults: number,
    items: PropTypes.arrayOf(
      PropTypes.shape(),
    ).isRequired,
  }).isRequired,
  categoryName: PropTypes.string.isRequired,
};
