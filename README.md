# About Next.js Image Gallery

This repository holds the sample source code for a [Next.js](https://nextjs.org) implementation of an image gallery site powered by Oracle Content Management.

Please see the [complete tutorial](https://www.oracle.com/pls/topic/lookup?ctx=cloud&id=oce-nextjs-gallery-sample) and [live demo](https://headless.mycontentdemo.com/samples/oce-nextjs-gallery-sample).

## Running the project

> **NOTE:** If you need to use a proxy to reach the internet then define an oce_https_proxy environment variable:

```shell
export oce_https_proxy=<scheme>://<proxyhost>:<port>
```

Install dependencies by running:

```shell
npm install
```

### Development

During development the dev script should be used:

```shell
npm run dev
```

This script builds the client and server bundles and starts the application in a local server. Webpack will watch for code changes and recreate the client and server bundles as required.

### Production

For production the build script should be used to build the client and server bundles. Run it using:

```shell
npm run build
```

When the script completes the application can be started using:

```shell
npm run start
```

and then open [http://localhost:3000](http://localhost:3000)

## Images

Sample images may be downloaded from [https://www.oracle.com/middleware/technologies/content-experience-downloads.html](https://www.oracle.com/middleware/technologies/content-experience-downloads.html) under a separate license.  These images are provided for reference purposes only and may not be hosted or redistributed by you.

## Contributing

This project welcomes contributions from the community. Before submitting a pull
request, please [review our contribution guide](./CONTRIBUTING.md).

## Security

Please consult the [security guide](./SECURITY.md) for our responsible security
vulnerability disclosure process.

## License

Copyright (c) 2021, Oracle and/or its affiliates.

Released under the Universal Permissive License v1.0 as shown at
<https://oss.oracle.com/licenses/upl/>.
