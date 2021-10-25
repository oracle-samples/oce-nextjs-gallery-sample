/**
 * Copyright (c) 2020, 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */

import { createDeliveryClient, createPreviewClient } from '@oracle/content-management-sdk';
import fetch from 'node-fetch';

/**
 * This file contains methods to create an Oracle Content SDK client to make calls to the Oracle
 * Content. A "delivery client" is used to view content which has been published to a public
 * channel or published to a secure channel.  The "preview client" is used to view content
 * which has been assigned to a channel but has not yet been published.
 *
 * The minimal information which needs to be specified is the server URL, the rest API version
 * to use and the channel token for the channel which contains the data to display in the app.
 *
 * When previewing content or using content in a secure channel, authentication is required.
 *
 * The AUTH_VALUE environment variable is used to specify the Authentication header value
 * (including "Basic"/"Bearer") when the value does not change.
 *
 * In OAuth environments, the CLIENT_ID/CLIENT_SECRET/CLIENT_SCOPE_URL/IDCS_URL environment
 * variables are used to to create and refresh an access token.
 *
 * When authentication is required, a "beforeSend" function has to be specified when creating
 * the Content SDK client.  This callback function is called just before the REST request
 * is made to Oracle Content in order for the caller to add additional things to the request.
 * This is where the Authorization header is added.
 */

/*
 * Time added to an access-token's expiry to ensure the token is refreshed before it
 * actually expires.
 */
const FIVE_SECONDS_MS = 5000;

/**
 * Module global variable containing the authentication header value
 * for any server requests.
 * for any server requests and the authExpiry if using OAuth
 */
let globalAuthValue = '';
let globalAuthExpiry = null;

/**
 * Indicates if authorization is needed on the requests to Oracle Content.
 */
export function isAuthNeeded() {
  if (process.env.AUTH || process.env.CLIENT_ID) {
    return true;
  }
  return false;
}

/**
 * Gets the Bearer authorization needed when using preview content or
 * content published to a secure channel.
 *
 * This will create a NEW access_token with a new expiry
 *
 * This is only called when rendering on the server, therefore we are safe
 * to use node-fetch and do not have to have a client version
 */
async function getBearerAuth() {
  // base64 encode CLIENT_ID:CLIENT_SECRET
  const authString = `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`;
  const authValue = (Buffer.from(authString)).toString('base64');

  // URL encode the CLIENT_SCOPE_URL
  const encodedScopeUrl = encodeURIComponent(process.env.CLIENT_SCOPE_URL);

  // build the full REST end point URL for getting the access token
  const restURL = new URL('/oauth2/v1/token', process.env.IDCS_URL);

  // make a request to the server to get the access token
  const response = await fetch(restURL.toString(), {
    body: `grant_type=client_credentials&scope=${encodedScopeUrl}`,
    headers: {
      Authorization: `Basic ${authValue}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  const responseJSON = await response.json();

  // get the access token and expiry from the response
  // and return an object containing the values
  const { access_token } = responseJSON;
  const expiry = responseJSON.expires_in;

  return {
    authHeaderValue: `Bearer ${access_token}`,
    expiry,
  };
}

/**
 * Returns the auth value for any requests
 */
export async function getAuthValue() {
  if (process.env.AUTH) {
    // if Auth has been specified set it as the global value
    globalAuthValue = process.env.AUTH;
  } else if (process.env.CLIENT_ID) {
    // Client ID specified which means the OAuth token needs to be generated if
    // token has not already been created, or it has expired
    const currentDate = new Date();
    // if the auth token has expired, refresh it, otherwise existing value will be returned
    // add a 5 second buffer to the expiry time
    if (!globalAuthValue || !globalAuthExpiry
       || (globalAuthExpiry.getTime() - FIVE_SECONDS_MS) > currentDate.getTime()) {
      globalAuthValue = '';
      const authDetails = await getBearerAuth();
      globalAuthValue = authDetails.authHeaderValue;
      // Auth Expiry
      // calculate expiry, get the current date (in ms), add the expiry ms, then
      // create a new Date object, using the adjusted milliseconds time
      let currDateMS = Date.now();
      currDateMS += authDetails.expiry;
      globalAuthExpiry = new Date(currDateMS);
    }
  } else {
    // no auth needed
    globalAuthValue = null;
    globalAuthExpiry = null;
  }

  return globalAuthValue;
}

/*
 * This function is called from the Oracle Content SDK before it makes any REST calls.

 * This is only called when rendering on the server.
 *
 * When this method is called from the node server, authorization headers are
 * added. This only needs to be done when rendering on the server as any client
 * requests are proxied through the Express server and therefore are handled in
 * 'src/server/server.js)
 */
function beforeSendCallback(param) {
  return new Promise((resolve, reject) => {
    try {
      return getAuthValue().then((authValue) => {
        param.headers = param.headers || {};
        param.headers.authorization = authValue;
        return resolve(true);
      });
    } catch (e) {
      return reject(new Error('Error getting auth value'));
    }
  });
}

/**
 * Returns a Delivery Client or a Preview Client to be used to access
 * content from Oracle Content Management server.
 */
export default function getClient() {
  // When creating a client for the browser and authorization is needed for calls to
  // Oracle Content
  // - all requests (content and images) are to be proxied through this application's
  //   Express server
  // - the ServerURL for the Oracle Content SDK client will be this application's host
  //
  // See the following files where proxying is setup/done
  // - 'src/scripts/utils.getImageUrl' for the code proxying requests for image binaries
  // - 'src/server/server' for the Express server proxying.
  const serverURL = (isAuthNeeded() && process.env.IS_BROWSER)
    ? `${window.location.origin}/`
    : process.env.SERVER_URL;

  const serverconfig = {
    contentServer: serverURL,
    contentVersion: process.env.API_VERSION,
    channelToken: process.env.CHANNEL_TOKEN,
  };

  // if authorization is needed to get data from Oracle Content and this is running on the server,
  // add the 'beforeSend' callback so the authorization header can be added to Oracle Content
  // requests
  if (isAuthNeeded() && !process.env.IS_BROWSER) {
    serverconfig.beforeSend = beforeSendCallback;
  }

  // Add the following if you want logging from the Oracle Content SDK shown in the console
  // serverconfig.logger = console;

  // create and return the relevant client
  if (process.env.PREVIEW) {
    return createPreviewClient(serverconfig);
  }
  return createDeliveryClient(serverconfig);
}
