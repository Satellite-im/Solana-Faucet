require('dotenv').config()

const web3 = require('@solana/web3.js')
const express = require('express')
const cors = require('cors')
const Database = require('./app/db')
const os = require('os-utils')

let db = new Database('AccessCodes')

const app = express()
const rpcURL = process.env.RPCURL

//Initializing Solana network connection using rpc endpoint that gives us much higher concurrent calls
const connection = new web3.Connection(rpcURL, 'confirmed')

//Retrieve payer account keys
const payerAccount = web3.Keypair.fromSecretKey(
  Buffer.from(process.env.PAYER_PRIVATE_KEY, 'base64'),
)

// controlled by host
app.use(
  cors({
    origin: '*',
  }),
)

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// parse application/json
app.use(express.json())

app.get('/', async (req, res) => {
  let allCodeStatus = await db.getStatus()
  return res.status(200).send('Hello - Please visit https://github.com/Satellite-im/Solana-Faucet for more information')
})

// Health URL to see that the API is still running
app.get('/health', async (req, res) => {
  let allCodeStatus = await db.getStatus()
  return res.status(200).json({
    uptimeSeconds: process.uptime(),
    environment: process.env.ENVIRONMENT,
    averageLoad: {// system activity https://nodejs.org/api/os.html#osloadavg
      one: os.loadavg(1),
      five: os.loadavg(5),
      fifteen: os.loadavg(15),
    },
    memory: {
      free: os.freemem(),
      total: os.totalmem(),
    },
    accessCodeUsage: allCodeStatus
  })
})

// URL for actually creating an account
app.post('/', async (req, res) => {
  //Retrieve public key from address, and the access code
  const { address, accessCode } = req.body

  if (!address) {
    return res
      .status(400)
      .json(commonResponse({ message: 'Malformed request, please include Address' }))
  }

  if (
    process.env.ENVIRONMENT === 'EARLY_ACCESS' &&
    !(await db.accessCodeIsValid(accessCode))
  ) {
    return res
      .status(400)
      .json(commonResponse({ message: 'Invalid Access Code' }))
  }

  // The faucet will ask to fund itself at each
  // api call
  requestAirdrop()

  const to = new web3.PublicKey(address)

  const balance = await connection.getBalance(to)

  if (balance < web3.LAMPORTS_PER_SOL * process.env.BALANCE_LIMIT) {
    try {
      // Add transfer instruction to transaction
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: payerAccount.publicKey,
          toPubkey: to,
          lamports: web3.LAMPORTS_PER_SOL * process.env.SOL_AMOUNT,
        }),
      )

      // Sign transaction, broadcast, and confirm
      const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payerAccount],
      )
      if (process.env.ENVIRONMENT === 'EARLY_ACCESS' && accessCode) {
        const codeVal = await db.incrementCode(accessCode)
        if (!codeVal) {
          res.status(400).json(
            commonResponse({
              message: 'The access code has already reached the maximum',
            }),
          )
        }
      }

      //response for web3 transaction success
      res
        .status(200)
        .json(commonResponse({ status: success, message: signature }))
    } catch (error) {
      //response for web3 transaction error
      res.status(400).json(commonResponse({ message: error }))
    }
  } else {
    //Response for balance limit excedeed
    res.status(400).json(
      commonResponse({
        message: 'The account balance limit has already been exceeded',
      }),
    )
  }
})

// Allows you to check a single access code for a boolean response if it's good or not
app.get('/checkCode/:accessCode', async (req, res) => {
  //Retrieve public key from address
  const { accessCode } = req.params
  const validStatus = await db.accessCodeIsValid(accessCode)

  // Access code does not exist or code is invalid
  if (!accessCode || !validStatus) {
    return res.status(400).json(
      commonResponse({
        message: 'Malformed request or invalid code',
      }),
    )
  }

  // Access code is valid!
  if (validStatus) {
    return res.status(200).json(
      commonResponse({
        status: 'success',
        message: 'Code is Valid',
      }),
    )
  }

  // handle other scenarios
  return res.status(400).json(commonResponse())
})

app.listen(process.env.PORT, () =>
  console.log(`Faucet listening on ${process.env.PORT}!`),
)

function commonResponse({ status = 'failed', message = 'Unknown Error' }) {
  return {
    status,
    message,
  }
}

async function requestAirdrop() {
  try {
    return connection.requestAirdrop(
      payerAccount.publicKey,
      web3.LAMPORTS_PER_SOL * 1,
    )
  } catch (e) {
    console.log(e)
  }
}
