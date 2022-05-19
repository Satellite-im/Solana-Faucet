require('dotenv').config()

const web3 = require('@solana/web3.js')
const express = require('express')
const cors = require('cors')
const Database = require('./app/db')

let db = new Database('AccessCodes')

const app = express()
const port = process.env.PORT

const SolanaClusters = ['devnet', 'testnet', 'mainnet-beta']

//Initializing Solana network connection
const connection = SolanaClusters.includes(process.env.SOLANA_NETWORK)
  ? new web3.Connection(
      web3.clusterApiUrl(process.env.SOLANA_NETWORK),
      'confirmed',
    )
  : new web3.Connection(process.env.SOLANA_NETWORK, 'confirmed')

//Retrieve payer account keys
const payerAccount = web3.Keypair.fromSecretKey(
  Buffer.from(process.env.PAYER_PRIVATE_KEY, 'base64'),
)

const corsOrigin = process.env.CORS_DOMAIN ? process.env.CORS_DOMAIN : '*'
app.use(
  cors({
    origin: corsOrigin,
  }),
)

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// parse application/json
app.use(express.json())

app.get('/', async (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Service Healthy',
  })
})
app.post('/', async (req, res) => {
  //Retrieve public key from address, and the access code
  const { address, accessCode } = req.body

  if (!address) {
    return res.status(400).json({
      status: 'failed',
      errorCode: 3,
      message: 'Malformed request',
    })
  }

  if (
    process.env.ENVIRONMENT === 'EARLY_ACCESS' &&
    !(await db.accessCodeIsValid(accessCode))
  ) {
    return res.status(400).json({
      status: 'failed',
      errorCode: 4,
      message: 'Invalid access code',
    })
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
        await db.incrementCode(accessCode)
      }

      //response for web3 transaction success
      res.json({
        status: 'success',
        transactionSignature: signature,
      })
    } catch (error) {
      //response for web3 transaction error
      res.json({
        status: 'failed',
        errorCode: 2,
        errorMessage: error,
      })
    }
  } else {
    //Response for balance limit excedeed
    res.json({
      status: 'failed',
      errorCode: 1,
      errorMessage: 'The account balance limit has already been exceeded',
    })
  }
})

// Returns an object with status on all access codes
app.get('/checkCode/status', async (req, res) => {
  let allCodeStatus = await db.getStatus()
  if (!allCodeStatus) {
    return res.status(400).json({
      status: 'failed',
      errorCode: 4,
      errorMessage: 'Malformed request or invalid code',
    })
  }
  return res.status(200).json({
    status: 'success',
    message: allCodeStatus,
  })
})

// Allows you to check a single access code for a boolean response if it's good or not
app.get('/checkCode/:accessCode', async (req, res) => {
  //Retrieve public key from address

  const { accessCode } = req.params
  let validStatus = await db.accessCodeIsValid(accessCode)
  if (!accessCode && !validStatus.status) {
    return res.status(400).json({
      status: 'failed',
      errorCode: 5,
      errorMessage: 'Malformed request or invalid code',
    })
  }
  if (validStatus) {
    return res.status(200).json({
      status: 'success',
      message: validStatus.status,
    })
  }
  return res.status(400).json({
    status: 'failed',
    errorCode: 6,
    errorMessage: 'Unknown Error',
  })
})

app.listen(port, () =>
  console.log(
    `Solana faucet app listening on port ${port}!`,
    'ENV: ',
    process.env.ENVIRONMENT,
  ),
)

async function requestAirdrop() {
  return connection.requestAirdrop(
    payerAccount.publicKey,
    web3.LAMPORTS_PER_SOL * 1,
  )
}
