FROM node:8.7.0-alpine

RUN mkdir /app
WORKDIR /app
ENV PATH /app/node_modules/.bin:/usr/local/bin:$PATH

ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json
ADD node_modules /app/node_modules
RUN npm i

ADD artifacts/config /app/config
ADD dist /app/dist

CMD ["node", "dist/index.js"]
