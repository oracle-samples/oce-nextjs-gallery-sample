/**
 * Copyright (c) 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */
import { isAuthNeeded } from './server-config-utils';

/**
 * When authorization is needed for images, change the image URL so that it
 * goes to this application's Express server in order for the authorization
 * headers are added to the request.
 *
 * See the following files where proxying is setup/done
 * - 'src/scripts/server-config-utils.getClient' for the code proxying requests for content
 * - 'src/server/server' for the Express server proxying.
 *
 * @param String originalUrl the image's original url
 */
export default function getImageUrl(originalUrl) {
  if (isAuthNeeded()) {
    // strip off the server URL from the front of the URL to make a relative URL
    // causing the request to go to this application's Express server
    return originalUrl.replace(process.env.NEXT_PUBLIC_SERVER_URL, '/api');
  }
  return originalUrl;
}
