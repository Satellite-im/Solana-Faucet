FROM node:14

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy files and RUN npm install
COPY ./server .
RUN npm install
COPY .env ./.env

EXPOSE 443
CMD [ "node", "index.js" ]