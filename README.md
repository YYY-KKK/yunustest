Getting Started
---------------

1. Install Yarn, if you don't have it already, from [yarnpkg.com](https://yarnpkg.com).

2. Install the Node.js dependency packages:

    ```
    yarn install --production
    ```

3. While the dependencies are installing, create a `server.yaml` config file in the root directory (or the custom working directory you are using) and set the path to the test repo directory in the `testRepoDir` config parameter.

4. Finally, run this command to start the sync service locally:

    ```
    yarn start
    ```