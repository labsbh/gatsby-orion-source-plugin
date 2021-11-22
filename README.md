## Gatsby plugin to source from Orion (LabSBH)

### Env vars

Add the following env vars in your website :

- `REACT_APP_JWT_TOKEN` A JWT with long expiration time
- `REACT_APP_API_ENDPOINT` : The Orion API endpoint


### Install
`yarn add gatsby-orion-source-plugin`

Add the plugin to `gatsby-config.js` :

```
module.exports = {
    // ...
    plugins: [
        // ...
        'gatsby-orion-source-plugin',
        // ...
    ]
    // ...
}
```
