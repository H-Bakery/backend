# Bakery Backend


### Commands

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"firstname":"Larry", "lastname": "Ostifrika", "password":"foobar"}' \
  http://localhost:5000/users
```

Migrate Heroku DB
```bash
yarn run migrate:prod:up
```
