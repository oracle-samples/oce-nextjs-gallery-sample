/**
 * Copyright (c) 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
/* eslint-disable no-param-reassign */

import getClient from './server-config-utils';
import getImageUrl from './utils';

/**
 * This file contains a number of utility methods used to obtain data
 * from the server using the Oracle Content SDK JavaScript Library.
 */

/* ----------------------------------------------------
 * Common Utils
 * ---------------------------------------------------- */

/*
 * Utility method to log an error.
 */
function logError(message, error) {
  if (error && typeof error.statusMessage) {
    console.log(`${message} : `, error.statusMessage);
  } else if (error) {
    console.log(message);
  }
}

/**
 * Flattens an array of arrays into a single array.
 *
 * Note:  ES6's array.flat() is not supported in Node pre version 11 so flatten manually.
 *
 * @param {Array} inArray - the array of arrays to flatten
 * @param {Array} result - the flattened array
 */
function flattenArray(inArray, result = []) {
  for (let i = 0, { length } = inArray; i < length; i += 1) {
    const arrayElement = inArray[i];
    if (Array.isArray(arrayElement)) {
      flattenArray(arrayElement, result);
    } else {
      result.push(arrayElement);
    }
  }
  return result;
}

/**
 * Private method for adding the specified format rendition to the rendition string
 *
 * @param {Object} url - the url which contains the rendition strings
 * @param {Object} rendition - the rendition field of the content sdk json object
 * @param {String} formatstr - the format string type - either webp or jpg
 */
function addRendition(urls, rendition, formatstr) {
  // Get the webp format field
  const format = rendition.formats.filter((item) => item.format === `${formatstr}`)[0];
  const self = format.links.filter((item) => item.rel === 'self')[0];
  const url = getImageUrl(self.href);
  const { width } = format.metadata;

  // Also save the jpg format so that it can be used as a default value for images
  if (formatstr === 'jpg') {
    urls[rendition.name.toLowerCase()] = url;
    urls.jpgSrcset += `${url} ${width}w,`;
  } else {
    urls.srcset += `${url} ${width}w,`;
  }
}

/**
 * Retrieve the sourceset for an asset that is constructed from the rendition
 *
 * @param {asset} client - the asset whose fields contain the various renditions
 * @returns {Object} - An Object containing the the sourceset as well as individual rendition
 * url that can be used as default src
 */
function getSourceSet(asset) {
  const urls = {};
  urls.srcset = '';
  urls.jpgSrcset = '';
  if (asset.fields && asset.fields.renditions) {
    asset.fields.renditions.forEach((rendition) => {
      addRendition(urls, rendition, 'jpg');
      addRendition(urls, rendition, 'webp');
    });
  }
  // add the native rendition to the srcset as well
  urls.srcset += `${asset.fields.native.links[0].href} ${asset.fields.metadata.width}w`;
  urls.native = asset.fields.native.links[0].href;
  urls.width = asset.fields.metadata.width;
  urls.height = asset.fields.metadata.height;
  return urls;
}

/* ----------------------------------------------------
 * APIs to get the data for the Home Page
 * ---------------------------------------------------- */

/**
 * Fetch the items that belong to the category whose id is specified.
 *
 * @param {DeliveryClient} client - he delivery client to get data from Oracle Content
 * @param {string} categoryId - if of the category whose items are to be obtained
 * @param {boolean} limit - true when only 4 items are to be returned,
 *                          otherwise false to get 100 items
 * @returns {Promise({Object})} - A Promise containing the data
 */
function fetchItemsForCategory(client, categoryId, limit) {
  return client
    .getItems({
      q: `(taxonomies.categories.nodes.id eq "${categoryId}" AND type eq "Image")`,
      limit: limit ? 4 : 100,
      totalResults: true,
    })
    .then((topLevelItem) => topLevelItem)
    .catch((error) => logError('Fetching items for category failed', error));
}

/**
 * Fetch the categories for the specified taxonomyId.
 *
 * @param {DeliveryClient} client - the delivery client to get data from Oracle Content
 * @param {string} taxonomyId - the id of the taxonomy whose categories are to be obtained
 * @returns {Promise({Object})} - A Promise containing the data
 */
function fetchCategoriesForTaxonomyId(client, taxonomyId) {
  return client
    .queryTaxonomyCategories({
      id: `${taxonomyId}`,
    })
    .then((topLevelItem) => topLevelItem)
    .catch((error) => logError('Fetching categories for taxonomy failed', error));
}

/**
 * Return a list of categories for all of taxonomies.
 *
 * @param {DeliveryClient} client - the delivery client to get data from Oracle Content
 * @returns {Promise({Object})} - A Promise containing the data
 */
export function fetchAllTaxonomiesCategories(client) {
  return client
    .getTaxonomies()
    .then((topLevelItem) => {
      const taxonomyIds = topLevelItem.items.map((taxonomy) => taxonomy.id);

      const promises = [];
      // loop over each taxonomy id
      taxonomyIds.forEach((taxonomyId) => {
        // add a promise to the total list of promises to get the categories
        // for the specific taxonomy id
        promises.push(
          fetchCategoriesForTaxonomyId(client, taxonomyId)
            .then((categoriesTopItem) => categoriesTopItem.items),
        );
      });

      // execute all the promises returning a single dimension array of all
      // of the categories for all of the taxonomies (note: no taxonomy information)
      // is returned.
      return Promise.all(promises)
        .then((arrayOfCategoryArray) => flattenArray(arrayOfCategoryArray));
    })
    .catch((error) => logError('Fetching taxonomies failed', error));
}

/**
 * Takes a list of categories, and returns an updated array where each
 * category has an array of its items added to it.
 *
 * @param {DeliveryClient} client - the delivery client to get data from Oracle Content
 * @param {Array} categories - the list of categories which is to have the items
 *                             for each category added to it
 * @returns {Promise({Object})} - A Promise containing the data
 */
function addItemsToCategories(client, categories) {
  const promises = [];

  // loop over each category
  categories.forEach((category) => {
    // add a promise to the total list of promises to get the items
    // for the specific category
    promises.push(
      fetchItemsForCategory(client, category.id, true).then(
        (topLevelItem) => {
          // add the item to the category before returning it
          category.items = topLevelItem.items;
          category.totalResults = topLevelItem.totalResults;
          // Note: the spread operator is used here so that we return a top level
          // object, rather than a value which contains the object
          // i.e we return
          //   {
          //     field1: 'value', field2 : 'value', etc
          //   },
          // rather than
          //   {
          //     name: {
          //             field1: 'value', field2 : 'value', etc
          //           }
          //    }
          return {
            ...category,
          };
        },
      ),
    );
  });

  // execute all the promises before returning the data
  return Promise.all(promises).then((arrayOfItems) => flattenArray(arrayOfItems));
}

/**
 * Return all the data required for the home page.
 *
 * The data returned is an object containing
 *   a list of categories where each category contains 4 of its items,
 *   a map of item id to thumbnail url.
 *
 * @returns {Promise({Object})} - A Promise containing the data
 */
export function getHomePageData() {
  const deliveryClient = getClient();
  // get the categories for all taxonomies then add all the category items to each category
  return fetchAllTaxonomiesCategories(deliveryClient).then(
    (initialCategories) => addItemsToCategories(deliveryClient, initialCategories).then(
      (categories) => {
        // pull out all of the items for all of the categories then
        // append the computed renditionUrls to each item.
        const allItems = categories.map((category) => category.items);
        const items = flattenArray(allItems);
        // for each item, retrieve the rendition urls and add it to the item
        items.forEach((item) => {
          item.renditionUrls = getSourceSet(item);
        });
        return { categories };
      },
    ),
  );
}

/* ----------------------------------------------------
 * APIs to get the data for the Image Grid Page
 * ---------------------------------------------------- */

/**
 * Returns all the data required for the Image Grid Page.
 *
 * The data returned contains
 *   count of the total number of categories,
 *   list of category items for the category with all their rendition URLS.
 *
 * @param {string} categoryId - the id of the category whose items are to be obtained
 * @returns {Promise({Object})} - A Promise containing the data
 */
export function getImageGridPageData(categoryId) {
  const client = getClient();

  return fetchItemsForCategory(client, categoryId, false).then(
    (topLevelItem) => {
      const { totalResults } = topLevelItem;
      // for each item, retrieve the rendition urls and add it to the item
      topLevelItem.items.forEach((item) => {
        item.renditionUrls = getSourceSet(item);
      });
      return {
        totalResults,
        items: topLevelItem.items,
      };
    },
  );
}
