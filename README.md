# URL's

DEV -> `https://dev-faucet.satellite.one/`
EARLY_ACCESS -> `https://ea-faucet.satellite.one/`

# TODO
add codes to standard api response
user correct response codes, also when no records are found but api did that successfully, should be a success status

# CORS
To access API, you must be on localhost:3000, localhost:3001, or *.satellite.one. To add more domains, contact Hogan or Manuel

# Environment Variables
| Variable      | Type | Description | Example |
| ----------- | ----------- | ----------- | ----------- |
| **`PORT`** | integer | http port for API | 3000
| **`PAYER_PRIVATE_KEY`** | string | Solana Payer Private Key (wallet with SOL in it) | (88 character string from Solana CLI)
| **`SOL_AMOUNT `** | decimal/float | How much sol is added to the account | 0.1
| **`BALANCE_LIMIT `** | decimal/float | Minimum value, fund if under this ammount | 0.1
| **`ENVIRONMENT `** | string | Which faucet do you want to use **EARLY_ACCESS** for access code, **DEV** for no access codes | EARLY_ACCESS (or) DEV
| **`PG_CONN `** | string | Postgres Connection String (if you are using EARLY_ACCESS | postgres://username:password@host:port/db
| **`RPCURL `** | string | RPC Endpoint (determins devnet, testnet, prod) | https://solana--devnet.datahub.figment.io/apikey/<api-key>

# Standard API Response Format
200 for success, 400 for failure
```javascript
	{ 
		"status": string  // eg: 'success' or 'failure'
		"message": string // differs based on request
	}
```

# Endpoints

### Health Endpoint [/health]

List server health information [GET]


+ Response 200 (application/json)

```javascript
{
    "uptimeSeconds": decimal, // service uptime in seconds
    "environment": string,    // api environment, DEV or EARLY_ACCESS
    "averageLoad": {.         // https://nodejs.org/api/os.html#osloadavg
      "one": decimal,         // Average Load for 1 minute
      "five": decimal,        // Average Load for 5 minutes
      "fifteen": decimal,     // Average Load for 15 minutes
    },
    "memory": {
      "free": decimal,        // MB Free Memory
      "total": decimal,       // MB Total Memory
    },
    accessCodeUsage: [
    	{
			"id": integer,      // Access code database ID
			"max": integer,     // Access code Max Usable
			"used": integer,    // Access code current used amount
		}
    ]
    }
```

### Fund Account [/]
Endpoint to fund a solana wallet [POST]

Body Params:

| Param      | Type | Required Environment | Description | Example |
| ----------- | ----------- | ----------- | ----------- | ----------- |
| **`address`** | string | DEV and EARLY_ACCESS | Solana Address | dv3qDFk1DTF36Z62bNvrCXe9sKATA6xvVy6A798CxAS
| **`accessCode`** | string | EARLY_ACCESS | Access code from DB | DEXTER123!

####Response 200 (application/json)
**`follows standard response format`**

**`message`** signature from @solana/web3.js sendAndConfirmTransaction method


#### Response 400 (application/json)
**`follows standard response format`**

**`message`**

| Text      | Description |
| ----------- | ----------- |
|`Malformed request, please include Address` | You must include 'address' in the body of the post message
| `Invalid Access Code` | You are on an EARLY_ACCESS faucet and forgot the accessCode in the body of the request
| `The account balance limit has already been exceeded` | The account has already been funded above the limit set in the environment variables
| `The access code has already reached the maximum` | The access code has already been used to it's maximum value. You must try again with a new access code that still has capacity
| generic web3 error code| If there is a web3 error with SystemProgram.transfer or SendAndConfirmTransaction, look [here](https://docs.solana.com/developing/clients/javascript-reference) for more info
||
