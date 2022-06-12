# Before to start

To start the project correctly you need to create an .env file with the following variables:

```
PORT = The server will listen on this port
SOLANA_NETWORK = Solana Network address (if local http://127.0.0.1:8899)
PAYER_PRIVATE_KEY = Private key of the payer account
SOL_AMOUNT = Amount of SOL that will be airdropped
BALANCE_LIMIT = Maximum amount of SOL that an account can hold
```

# How to run

1. Build the docker image

```shell
docker-compose build
```

2. Run the faucet service

```shell
docker-compose up
```
