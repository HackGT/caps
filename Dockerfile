FROM node:10-alpine

# Bundle app source
WORKDIR /usr/src/caps
COPY . /usr/src/caps
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
