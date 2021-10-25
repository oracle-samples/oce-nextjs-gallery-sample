/**
 * Copyright (c) 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
import http from 'http';
import https from 'https';
import { getAuthValue, isAuthNeeded } from '../../../scripts/server-config-utils';

/*
 * Handle the proxy request.
 */
function handleContentRequest(req, res, authValue) {
  // only proxy GET requests, ignore all other requests
  if (req.method !== 'GET') {
    return;
  }

  // build the URL to the real server
  // strip off the 'api' at the front of the URL
  const newURL = req.url.replace('/api/', '/');
  // build the URL to the real server
  const oceUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${newURL}`;

  // Add the authorization header
  const options = {};
  if (authValue) {
    options.headers = { Authorization: authValue };
  }

  // define a function that writes the proxied content to the response
  const writeProxyContent = (proxyResponse) => {
    res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
    proxyResponse.pipe(res, {
      end: true,
    });
  };

  // based on whether the Content server is HTTP or HTTPS make the request to it
  const proxy = (oceUrl.startsWith('https'))
    ? https.request(oceUrl, options, (proxyResponse) => writeProxyContent(proxyResponse))
    : http.request(oceUrl, options, (proxyResponse) => writeProxyContent(proxyResponse));

  // write the proxied response to this request's response
  req.pipe(proxy, {
    end: true,
  });
}

/*
 * Handler for requests to '/content/'.
 *
 * When authorization is needed for the calls to
 * - all image requests will be proxied through here regardless of server or client side rendering
 * - browser requests for content are proxied through here (server content requests will never be
 *   proxied)
 * - this server will pass on the call to Oracle Content adding on the authorization headers and
 *   returning the Oracle Content response.
 * This ensures the browser will never have the authorization header visible in its requests.
 *
 * See the following files where proxying is setup
 * - 'src/scripts/server-config-utils.getClient' for the code proxying requests for content
 * - 'src/scripts/utils.getImageUrl' for the code proxying requests for image binaries
 */
export default async function handler(req, res) {
  // disabling this lint as we will always return a response in the 'writeProxyContent' method
  // eslint-disable-next-line consistent-return
  return new Promise(() => {
    if (isAuthNeeded()) {
      getAuthValue().then((authValue) => {
        handleContentRequest(req, res, authValue);
      });
    } else {
      handleContentRequest(req, res, '');
    }
  });
}
