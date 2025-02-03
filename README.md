# mmo-ecc-reference-data-reader

main service to load reference data and run cron jobs including retrospect validation

# Things to Consider
* This repository should use GitFlow as a branching strategy.
* <img
    src="docs/images/GitFlow-branching-strategy.png"
    alt="Branching Strategy"
    title="GitFlow"
    style="display: inline-block; margin: 0 auto; max-width: 350px">
* If you won't call your branch as per agreed branching `standards`, the Azure pipeline won't start or may fail to deploy an image.



###To run after cloned:
```
 $ cd mmo-ecc-fe
 $ cp .envSample .env
 $ npm i
 $ npm start
```

###To run test
```
$ npm test
```

