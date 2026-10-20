# This assumes that the parent image has been built locally using production and development build configuration as defra-node
# and defra-node-development tagged with a version.
ARG NPM_TOKEN
ARG DEFRA_BASE_IMAGE_TAG=latest-24
FROM defradigital/node-development:$DEFRA_BASE_IMAGE_TAG as base
# ARGs are cleared by each FROM — redeclare to make it available to npm ci below
ARG NPM_TOKEN

# We have production dependencies requiring node-gyp builds which don't
#   install cleanly with the defradigital/node image. So we'll install them here
#   and set NODE_ENV to production before copying them to the production image.
ENV NODE_ENV production

# Set the port that is going to be exposed later on in the Dockerfile as well.
ARG PORT=9000
ENV PORT=${PORT}

ARG GIT_HASH=""

# This installs the exact versions of the packages
#   listed in package-lock.json, and does not update either the package-lock.json
#   or the package.json file.
USER root
RUN mkdir /app && chown node:node /app
USER node

COPY --chown=node:node package*.json .npmrc /app/
WORKDIR /app

RUN npm ci --legacy-peer-deps

# Using the development image (which has NODE_ENV=development) we will install
#   all devDependencies & build the project.
FROM defradigital/node-development:$DEFRA_BASE_IMAGE_TAG as test
# ARGs are cleared by each FROM — redeclare to make it available to npm ci below
ARG NPM_TOKEN
USER root
RUN mkdir /app && chown node:node /app
USER node

COPY --chown=node:node . /app
COPY --from=base --chown=node:node /app/node_modules/ /app/node_modules/
WORKDIR /app
RUN npm ci --legacy-peer-deps
CMD ["npm", "run", "test:ci"]

FROM test as development
RUN npm run build
CMD ["node", "dist/start.js"]

# Production stage exposes service port, copies in built app code and declares the Node app as the default command
FROM defradigital/node:$DEFRA_BASE_IMAGE_TAG as production

# Copy in the files that we built using the tools in the development stage. The final production stage will have the built files,
#   but none of the tools required to build those files. This reduces the attack surface, and also the size of the final production image
COPY --from=base --chown=node:node /app/node_modules/ /app/node_modules/
COPY --from=development --chown=node:node /app/dist/ /app/dist/
COPY --chown=node:node data/ /app/data/
RUN echo $GIT_HASH > githash

# Intermediate CA missing from the DEFRA parent image; staged by pipeline-common, may be DER or PEM
USER root
COPY certificates/intermediate-ca.crt /tmp/intermediate-ca.crt
RUN node -e "const fs=require('fs');const c=new (require('crypto').X509Certificate)(fs.readFileSync('/tmp/intermediate-ca.crt'));if(!c.ca||new Date(c.validTo)<new Date()){console.error('Invalid intermediate CA certificate');process.exit(1)}fs.writeFileSync('/usr/local/share/ca-certificates/intermediate-ca.crt',c.toString())" \
  && update-ca-certificates \
  && cat "$NODE_EXTRA_CA_CERTS" /usr/local/share/ca-certificates/intermediate-ca.crt > /etc/ssl/node-extra-ca.pem \
  && chmod 644 /usr/local/share/ca-certificates/intermediate-ca.crt /etc/ssl/node-extra-ca.pem \
  && rm /tmp/intermediate-ca.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/node-extra-ca.pem

# Again, be explict about the permissions we want for this stage
USER node
WORKDIR /app

# Expose the PORT passed in at the start of the file
EXPOSE ${PORT}

#The base node image sets a very verbose log level, we're just going to warn
ENV NPM_CONFIG_LOGLEVEL=info
ENV NODE_OPTIONS=--max_old_space_size=8192
# This is the command that is run for the production service. The parent image has an ENTRYPOINT that uses a lightweight
#   init program "tini" that handles signals. As long as we don't override the ENTRYPOINT the "tini" routine will handle signals and
#   orphaned processes
CMD ["node", "dist/start.js"]
